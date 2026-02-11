"""Quick check script to verify database has data"""
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os
import asyncio

load_dotenv('.env')

async def check_db():
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    users_count = await db.users.count_documents({})
    print(f"Total users in database: {users_count}")
    
    admin_user = await db.users.find_one({"email": "admin@magnova.com"})
    if admin_user:
        print("✓ Admin user found")
        print(f"  Email: {admin_user['email']}")
        print(f"  Name: {admin_user['name']}")
        print(f"  Has password: {bool(admin_user.get('password'))}")
    else:
        print("✗ Admin user NOT found")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(check_db())
