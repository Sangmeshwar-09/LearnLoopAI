import chromadb
from chromadb.config import Settings
from typing import List, Dict
from backend.config import CHROMA_DB_PATH
from backend.rag.embeddings import get_embeddings
import logging

logger = logging.getLogger(__name__)

# Initialize ChromaDB client
try:
    chroma_client = chromadb.PersistentClient(
        path=CHROMA_DB_PATH, 
        settings=Settings(anonymized_telemetry=False)
    )
    logger.info(f"ChromaDB client initialized at {CHROMA_DB_PATH}")
except Exception as e:
    logger.error(f"Failed to initialize ChromaDB client: {str(e)}")
    chroma_client = None

def create_collection(collection_name: str):
    """Create a new ChromaDB collection with error handling"""
    if not chroma_client:
        raise RuntimeError("ChromaDB client not initialized")
    
    try:
        collection = chroma_client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"}
        )
        logger.info(f"ChromaDB collection created/retrieved: {collection_name}")
        return collection
    except Exception as e:
        logger.error(f"Error creating ChromaDB collection '{collection_name}': {str(e)}")
        raise

def add_documents_to_collection(collection_name: str, chunks: List[str], metadatas: List[Dict] = None):
    """
    Add document chunks to ChromaDB collection with comprehensive error handling
    """
    if not chunks:
        logger.warning("No chunks provided to add_documents_to_collection")
        raise ValueError("No chunks to add")
    
    if len(chunks) == 0:
        raise ValueError("Chunks list is empty")
    
    try:
        collection = create_collection(collection_name)
        logger.info(f"Adding {len(chunks)} chunks to collection '{collection_name}'")
        
        # Generate embeddings with error handling and fallback
        try:
            embeddings = get_embeddings(chunks)
            logger.info(f"✅ Embeddings generated successfully for {len(chunks)} chunks")
        except Exception as e:
            logger.warning(f"Embedding generation failed, using fallback embeddings: {str(e)}")
            # Use fallback embeddings instead of failing completely
            from backend.rag.embeddings import _generate_embedding_fallback
            embeddings = [_generate_embedding_fallback(chunk) for chunk in chunks]
            logger.info(f"✅ Using fallback embeddings for {len(chunks)} chunks")
        
        if not embeddings or len(embeddings) != len(chunks):
            raise ValueError(f"Embedding count mismatch: got {len(embeddings)}, expected {len(chunks)}")
        
        # Create IDs
        ids = [f"chunk_{i}" for i in range(len(chunks))]
        
        # Prepare metadatas
        if metadatas is None:
            metadatas = [{"chunk_index": i} for i in range(len(chunks))]
        
        if len(metadatas) != len(chunks):
            raise ValueError(f"Metadata count mismatch: got {len(metadatas)}, expected {len(chunks)}")
        
        # Add to collection
        try:
            collection.add(
                embeddings=embeddings,
                documents=chunks,
                metadatas=metadatas,
                ids=ids
            )
            logger.info(f"✅ Successfully added {len(chunks)} chunks to '{collection_name}'")
        except Exception as e:
            logger.error(f"Failed to add documents to ChromaDB: {str(e)}")
            raise
        
        return collection
    
    except Exception as e:
        logger.error(f"Error in add_documents_to_collection: {str(e)}", exc_info=True)
        raise

def retrieve_relevant_chunks(collection_name: str, query: str, n_results: int = 5) -> List[Dict]:
    """
    Retrieve relevant chunks from ChromaDB based on query
    Returns list of dictionaries with 'text', 'metadata', and 'distance'
    Handles errors gracefully and returns empty list on failure
    """
    if not chroma_client:
        logger.error("ChromaDB client not initialized")
        return []
    
    if not query or not query.strip():
        logger.warning("Empty query provided to retrieve_relevant_chunks")
        return []
    
    try:
        collection = chroma_client.get_collection(collection_name)
        logger.debug(f"📚 Retrieved collection '{collection_name}' with {collection.count()} documents")
    except Exception as e:
        logger.warning(f"❌ Collection '{collection_name}' not found: {str(e)}")
        return []
    
    # Generate query embedding
    try:
        from backend.rag.embeddings import get_embedding
        query_embedding = get_embedding(query)
        logger.debug(f"🔍 Generated embedding for query: '{query[:40]}...'")
    except Exception as e:
        logger.error(f"❌ Failed to generate query embedding: {str(e)}")
        return []
    
    # Query collection - ChromaDB 1.4.0 supports both query_texts and query_embeddings
    results = None
    try:
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=n_results
        )
        logger.debug(f"✅ ChromaDB query successful - found {len(results.get('documents', [[]])[0])} results")
    except Exception as e:
        # Fallback: try with query_texts if query_embeddings doesn't work
        logger.debug(f"query_embeddings failed, trying query_texts: {str(e)}")
        try:
            results = collection.query(
                query_texts=[query],
                n_results=n_results
            )
            logger.debug(f"✅ ChromaDB fallback query successful - found {len(results.get('documents', [[]])[0])} results")
        except Exception as e2:
            logger.error(f"❌ Both query methods failed for collection '{collection_name}': {str(e2)}")
            return []
    
    # Format results safely
    try:
        retrieved_chunks = []
        if results and 'documents' in results and results['documents'] and len(results['documents'][0]) > 0:
            for i in range(len(results['documents'][0])):
                chunk_text = results['documents'][0][i]
                if chunk_text:  # Ensure we have text
                    retrieved_chunks.append({
                        'text': chunk_text,
                        'metadata': results.get('metadatas', [[{}]])[0][i] if results.get('metadatas') else {},
                        'distance': results.get('distances', [[0.0]])[0][i] if results.get('distances') else 0.0
                    })
        
        logger.info(f"Retrieved {len(retrieved_chunks)} chunks from '{collection_name}'")
        return retrieved_chunks
    
    except Exception as e:
        logger.error(f"Error formatting ChromaDB results: {str(e)}")
        return []

def retrieve_chunks_by_topics(collection_name: str, topics: List[str], n_results_per_topic: int = 3) -> List[Dict]:
    """
    Retrieve chunks related to specific topics
    """
    if not topics:
        logger.warning("No topics provided to retrieve_chunks_by_topics")
        return []
    
    all_chunks = []
    seen_texts = set()
    
    for topic in topics:
        try:
            chunks = retrieve_relevant_chunks(collection_name, topic, n_results_per_topic)
            for chunk in chunks:
                if chunk['text'] not in seen_texts:
                    all_chunks.append(chunk)
                    seen_texts.add(chunk['text'])
        except Exception as e:
            logger.warning(f"Error retrieving chunks for topic '{topic}': {str(e)}")
            continue
    
    logger.info(f"Retrieved {len(all_chunks)} total chunks for {len(topics)} topics")
    return all_chunks
