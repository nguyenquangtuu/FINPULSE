import aiomysql
import logging
from app.core.config import settings

logger = logging.getLogger("notification-service.db")

db_pool: aiomysql.Pool | None = None

async def connect_db():
    global db_pool
    try:
        db_pool = await aiomysql.create_pool(
            host=settings.MYSQL_HOST,
            port=settings.MYSQL_PORT,
            user=settings.MYSQL_USER,
            password=settings.MYSQL_PASSWORD,
            db=settings.MYSQL_DATABASE,
            charset="utf8mb4",
            autocommit=True,
            minsize=1,
            maxsize=10,
        )
        logger.info("Connected to MySQL notification_db pool successfully")
    except Exception as e:
        logger.error(f"Failed to connect to MySQL notification_db: {e}")
        raise e

async def close_db():
    global db_pool
    if db_pool:
        db_pool.close()
        await db_pool.wait_closed()
        logger.info("Closed MySQL notification_db pool")
