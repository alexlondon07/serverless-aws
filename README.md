# Pizza App - Serverless Framework

Pizza order management system built with AWS Lambda, API Gateway and SQS using Serverless Framework.

## 📋 Description

This serverless application allows receiving, processing and managing pizza orders using an event-driven architecture with AWS Lambda and SQS queues for asynchronous processing.

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│   API Gateway   │    │   Lambda         │    │   SQS Queue         │
│                 │    │   Functions      │    │                     │
├─────────────────┤    ├──────────────────┤    ├─────────────────────┤
│ POST /order     │───▶│ newOrder         │───▶│ pendingOrderQueue   │
│ GET /order/{id} │───▶│ getOrder         │    │                     │
└─────────────────┘    └──────────────────┘    └─────────────────────┘
                                │                         │
                                │                         ▼
                       ┌──────────────────┐    ┌─────────────────────┐
                       │ prepOrder        │◀───│ SQS Trigger         │
                       │ (SQS Consumer)   │    │                     │
                       └──────────────────┘    └─────────────────────┘
                                │
                                ▼
                       ┌──────────────────┐    ┌─────────────────────┐
                       │ sendOrder        │───▶│ ordersToSendQueue   │
                       │                  │    │                     │
                       └──────────────────┘    └─────────────────────┘
```

## 🚀 Lambda Functions

### 1. newOrder
- **Handler**: `handler.newOrder`
- **Trigger**: HTTP POST `/order`
- **Purpose**: Receives new pizza orders and sends them to processing queue
- **Environment Variables**:
  - `PENDING_ORDER_QUEUE_URL`: URL of pending orders queue
- **Flow**:
  1. Generates unique UUID for the order
  2. Parses order details from body
  3. Sends order to `pendingOrderQueue`
  4. Returns confirmation with order details

### 2. getOrder
- **Handler**: `handler.getOrder`
- **Trigger**: HTTP GET `/order/{orderId}`
- **Purpose**: Queries details of a specific order
- **Parameters**: `orderId` (path parameter)
- **Response**: Simulated order details (pizza, customerId, status)

### 3. prepOrder
- **Handler**: `handler.prepOrder`
- **Trigger**: SQS Event from `pendingOrderQueue`
- **Purpose**: Processes pending orders from queue
- **Configuration**: `batchSize: 1` (processes one message at a time)
- **Current State**: Placeholder function for preparation logic

### 4. sendOrder
- **Handler**: `handler.sendOrder`
- **Trigger**: Manual/programmatic invocation
- **Purpose**: Sends processed orders to shipping queue
- **Environment Variables**:
  - `ORDERS_TO_SEND_QUEUE_URL`: URL of orders to send queue

## 🌐 HTTP Endpoints

| Method | Endpoint           | Function | Description            |
| ------ | ------------------ | -------- | ---------------------- |
| POST   | `/order`           | newOrder | Create new pizza order |
| GET    | `/order/{orderId}` | getOrder | Get order details      |

### Usage Examples:

**Create order:**
```bash
curl -X POST https://your-api-gateway-url/order \
  -H "Content-Type: application/json" \
  -d '{
    "pizza": "Pepperoni",
    "customerId": "12345",
    "size": "large"
  }'
```

**Query order:**
```bash
curl https://your-api-gateway-url/order/uuid-here
```

## 📦 AWS Resources

### SQS Queues
1. **pendingOrderQueue**: Queue for new orders pending processing
2. **ordersToSendQueue**: Queue for orders ready for shipping

### IAM Permissions
- `sqs:sendMessage` on both SQS queues
- Automatic roles for Lambda execution

## 🛠️ Configuration

### Global environment variables:
- `REGION`: us-east-1

### Runtime:
- Node.js 20.x
- AWS Provider

## 📋 Dependencies

```json
{
  "uuid": "^11.1.0",
  "@aws-sdk/client-sqs": "included in runtime"
}
```

## 🚀 Deployment

```bash
# Install dependencies
npm install

# Deploy to AWS
serverless deploy

# Remove stack
serverless remove
```

## 📊 Data Flow

1. **Client** sends POST to `/order`
2. **newOrder** generates UUID and sends to `pendingOrderQueue`
3. **prepOrder** is automatically triggered by SQS trigger
4. **sendOrder** can be invoked to move orders to `ordersToSendQueue`
5. **Client** can query status with GET `/order/{id}`

## 🔧 Suggested Improvements

- Implement DynamoDB persistence
- Add schema validation
- Implement robust error handling
- Add structured logging
- Implement unit tests
- Add CloudWatch monitoring

## 👨💻 Author

Alexander Londoño Espejo