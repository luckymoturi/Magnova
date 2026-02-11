"""
Clear all fake data from MongoDB
"""

from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
import os
import asyncio

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

async def clear_database():
    """Clear all collections from the database"""
    print("=" * 60)
    print("Clearing all data from MongoDB...")
    print("=" * 60)
    
    try:
        collections = await db.list_collection_names()
        
        if not collections:
            print("No collections found in database.")
            return
        
        print(f"\nFound {len(collections)} collections:")
        for collection in collections:
            print(f"  - {collection}")
        
        print("\nDeleting collections...")
        for collection in collections:
            result = await db[collection].delete_many({})
            print(f"✓ Cleared {collection}: {result.deleted_count} documents deleted")
        
        print("\n" + "=" * 60)
        print("✓ All data cleared successfully!")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n✗ Error clearing database: {e}")
        import traceback
        traceback.print_exc()
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(clear_database())
