#!/usr/bin/env python3
"""Test SMTP IPv4 resolution fix"""
import socket
import smtplib
import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
load_dotenv(Path(__file__).parent / '.env')

def test_ipv4_resolution():
    """Test that we can resolve smtp.gmail.com to IPv4"""
    print("Testing IPv4 DNS resolution...")

    # Test original getaddrinfo (might fail on some systems)
    print("\n1. Testing original socket.getaddrinfo:")
    try:
        result = socket.getaddrinfo("smtp.gmail.com", 465)
        print(f"   Result: {result[:2]}...")  # Show first 2 results
    except Exception as e:
        print(f"   Error: {e}")

    # Test IPv4-only getaddrinfo (our fix)
    print("\n2. Testing IPv4-only resolution:")
    try:
        result = socket.getaddrinfo("smtp.gmail.com", 465, socket.AF_INET)
        print(f"   Result: {result}")
        print(f"   IPv4 address: {result[0][4][0]}")
    except Exception as e:
        print(f"   Error: {e}")

def test_smtp_connection():
    """Test SMTP connection with IPv4-only resolution"""
    print("\n\nTesting SMTP connection with IPv4-only fix...")

    gmail_sender = os.environ.get("GMAIL_SENDER", "")
    gmail_pass = os.environ.get("GMAILPASS", "")

    if not gmail_sender or not gmail_pass:
        print("Error: GMAIL_SENDER and GMAILPASS must be set in .env file")
        return False

    # Save original and create IPv4-only version
    original_getaddrinfo = socket.getaddrinfo
    def ipv4_only_getaddrinfo(host, port, family=0, type=0, proto=0, flags=0):
        return original_getaddrinfo(host, port, socket.AF_INET, type, proto, flags)

    try:
        # Apply the monkey-patch
        socket.getaddrinfo = ipv4_only_getaddrinfo
        print("\n3. Testing SMTP_SSL connection (port 465):")

        try:
            server = smtplib.SMTP_SSL("smtp.gmail.com", 465)
            print("   Connected successfully!")
            print("   Server greeting received")
            server.quit()
            return True
        except Exception as e:
            print(f"   SMTP_SSL failed: {e}")
            print("\n   Trying SMTP with STARTTLS (port 587)...")
            try:
                server = smtplib.SMTP("smtp.gmail.com", 587)
                server.starttls()
                print("   Connected successfully via STARTTLS!")
                server.quit()
                return True
            except Exception as e2:
                print(f"   STARTTLS failed: {e2}")
                return False
    finally:
        # Restore original
        socket.getaddrinfo = original_getaddrinfo

if __name__ == "__main__":
    test_ipv4_resolution()
    test_smtp_connection()
    print("\n\nDone!")