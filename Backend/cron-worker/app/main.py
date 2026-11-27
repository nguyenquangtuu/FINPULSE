import asyncio
import logging
import os
import httpx
from apscheduler.schedulers.asyncio import AsyncIOScheduler

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] [cron-worker] %(message)s")
logger = logging.getLogger("cron-worker")

FINANCE_SERVICE_URL = os.getenv("FINANCE_SERVICE_URL", "http://finance-core-service:8002")
NOTIFICATION_SERVICE_URL = os.getenv("NOTIFICATION_SERVICE_URL", "http://notification-service:8007")
INTERNAL_SERVICE_KEY = os.getenv("INTERNAL_SERVICE_KEY", "finpulse_internal_service_secret_token_2026")

async def run_recurring_transactions_job():
    logger.info("Executing scheduled job: check and generate due recurring transactions...")
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{FINANCE_SERVICE_URL}/api/finance/internal/recurring/execute-due",
                headers={"X-Internal-Service-Key": INTERNAL_SERVICE_KEY},
            )
            if resp.status_code == 200:
                data = resp.json().get("data", {})
                logger.info(f"Recurring transactions job finished: {data.get('executed_count', 0)} transactions generated")
            else:
                logger.warning(f"Recurring transactions job returned status {resp.status_code}: {resp.text}")
    except Exception as e:
        logger.warning(f"Could not connect to finance-core-service: {e}")

async def run_daily_reminders_job():
    logger.info("Executing scheduled job: check daily expense logging reminders...")
    try:
        payload = {
            "user_id": "22222222-2222-2222-2222-222222222222", # Demo user reminder
            "title": "Nhắc nhở ghi sổ thu chi hôm nay",
            "content": "Đừng quên dành 1 phút cập nhật các khoản chi tiêu trong ngày trên FINPULSE nhé!",
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{NOTIFICATION_SERVICE_URL}/api/notifications/internal/remind-daily",
                json=payload,
                headers={"X-Internal-Service-Key": INTERNAL_SERVICE_KEY},
            )
            if resp.status_code == 200:
                logger.info("Daily reminder sent successfully")
            else:
                logger.warning(f"Reminder job returned status {resp.status_code}")
    except Exception as e:
        logger.warning(f"Could not connect to notification-service: {e}")

async def main():
    logger.info("Starting Automated Task Worker (Cron Job Scheduler)...")
    
    # Run once at startup
    await asyncio.sleep(5)
    await run_recurring_transactions_job()

    scheduler = AsyncIOScheduler()
    # Check recurring transactions every 2 minutes in background
    scheduler.add_job(run_recurring_transactions_job, "interval", minutes=2)
    # Check reminders daily (simulated interval of 30 minutes for demo)
    scheduler.add_job(run_daily_reminders_job, "interval", minutes=30)
    scheduler.start()

    try:
        while True:
            await asyncio.sleep(3600)
    except (KeyboardInterrupt, SystemExit):
        logger.info("Stopping Cron Worker...")

if __name__ == "__main__":
    asyncio.run(main())
