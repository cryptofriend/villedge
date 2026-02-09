#!/bin/bash

# Default values
FUNCTION_URL="http://localhost:54321/functions/v1"
NOTIFY_FUNCTION="notify-telegram"
DEBUG_FUNCTION="telegram-debug-chat-ids"

echo "=========================================="
echo "Telegram Bot Manual Invocation Tool"
echo "=========================================="
echo "This script helps you manually invoke the Telegram bot Edge Functions."
echo "Make sure your Supabase local development server is running!"
echo ""

PS3="Select an action: "
options=("Send Test Notification" "Send Bulletin" "Send New Spot" "Check Chat IDs" "Quit")
select opt in "${options[@]}"
do
    case $opt in
        "Send Test Notification")
            echo "Sending 'test' notification..."
            curl -X POST "$FUNCTION_URL/$NOTIFY_FUNCTION" \
                -H "Content-Type: application/json" \
                -d '{"type": "test"}'
            echo ""
            echo "Done."
            ;;
        "Send Bulletin")
            read -p "Enter bulletin message: " message
            echo "Sending 'bulletin' notification..."
            # Note: This sends to the default bulletin endpoint/chat unless overridden
            curl -X POST "$FUNCTION_URL/$NOTIFY_FUNCTION" \
                -H "Content-Type: application/json" \
                -d "{\"type\": \"bulletin\", \"message\": \"$message\", \"name\": \"Manual Test\"}"
            echo ""
            echo "Done."
            ;;
        "Send New Spot")
            read -p "Enter spot name: " name
            read -p "Enter spot description: " desc
            echo "Sending 'spot' notification..."
            curl -X POST "$FUNCTION_URL/$NOTIFY_FUNCTION" \
                -H "Content-Type: application/json" \
                -d "{\"type\": \"spot\", \"name\": \"$name\", \"description\": \"$desc\", \"category\": \"playground\", \"location\": \"The Internet\"}"
            echo ""
            echo "Done."
            ;;
        "Check Chat IDs")
            read -p "Enter limit (default 20): " limit
            limit=${limit:-20}
            echo "Fetching recent chat IDs..."
            curl -X POST "$FUNCTION_URL/$DEBUG_FUNCTION" \
                -H "Content-Type: application/json" \
                -d "{\"limit\": $limit}" \
                | python3 -m json.tool || echo "Failed to parse JSON response. Check if function is running."
            echo ""
            echo "Done."
            ;;
        "Quit")
            break
            ;;
        *) echo "Invalid option $REPLY";;
    esac
    echo ""
    echo "------------------------------------------"
done
