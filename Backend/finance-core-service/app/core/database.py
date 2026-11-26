import aiomysql
import logging
from app.core.config import settings

logger = logging.getLogger("finance-core-service.db")

_actual_pool: aiomysql.Pool | None = None

class DBPoolProxy:
    def acquire(self, *args, **kwargs):
        if _actual_pool is None:
            raise RuntimeError("Database pool has not been initialized yet")
        return _actual_pool.acquire(*args, **kwargs)

    def close(self):
        if _actual_pool:
            _actual_pool.close()

    async def wait_closed(self):
        if _actual_pool:
            await _actual_pool.wait_closed()

db_pool = DBPoolProxy()

async def connect_db():
    global _actual_pool
    try:
        _actual_pool = await aiomysql.create_pool(
            host=settings.MYSQL_HOST,
            port=settings.MYSQL_PORT,
            user=settings.MYSQL_USER,
            password=settings.MYSQL_PASSWORD,
            db=settings.MYSQL_DATABASE,
            charset="utf8mb4",
            autocommit=False, # Explicit transactions for financial ACID
            minsize=1,
            maxsize=15,
        )
        logger.info("Connected to MySQL finance_db pool successfully")
    except Exception as e:
        logger.error(f"Failed to connect to MySQL finance_db: {e}")
        raise e

async def close_db():
    global _actual_pool
    if _actual_pool:
        _actual_pool.close()
        await _actual_pool.wait_closed()
        logger.info("Closed MySQL finance_db pool")
