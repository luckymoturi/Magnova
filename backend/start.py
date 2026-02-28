"""
Magnova Backend — Production Entrypoint
Reads PORT from environment (Railway injects it at runtime).
Using Python avoids shell variable expansion issues with $PORT.
"""
import os
import uvicorn

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    print(f"Starting Magnova backend on port {port}")
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=port,
        workers=1,
        log_level="info",
    )
