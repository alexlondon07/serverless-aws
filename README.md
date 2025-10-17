# Pizza App - Serverless Framework

Pizza order management system built with AWS Lambda, API Gateway, SQS, and DynamoDB using Serverless Framework.

## 📋 Description

This serverless application allows receiving, processing and managing pizza orders using an event-driven architecture with AWS Lambda, SQS queues for asynchronous processing, and DynamoDB for data persistence.

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
                                ▼                         ▼
                       ┌──────────────────┐    ┌─────────────────────┐
                       │   DynamoDB       │    │ prepOrder           │
                       │   Orders Table   │◀───│ (SQS Consumer)      │
                       └──────────────────┘    └─────────────────────┘
                                ▲                         │
                                │                         ▼
                                │              ┌─────────────────────┐
                                └──────────────│ sendOrder           │
                                               │                     │
                                               └─────────────────────┘
                                                         │
                                                         ▼
                                               ┌─────────────────────┐
                                               │ ordersToSendQueue   │
                                               │                     │
                                               └─────────────────────┘
```

## 🚀 Lambda Functions

### 1. newOrder
- **Handler**: `handler.newOrder`
- **Trigger**: HTTP POST `/order`
- **Purpose**: Receives new pizza orders, stores them in DynamoDB and sends them to processing queue
- **Environment Variables**:
  - `PENDING_ORDER_QUEUE_URL`: URL of pending orders queue
  - `ORDERS_TABLE`: DynamoDB table name for orders
- **Flow**:
  1. Generates unique UUID for the order
  2. Parses order details from body
  3. Stores order in DynamoDB Orders table
  4. Sends order to `pendingOrderQueue`
  5. Returns confirmation with order details

### 2. getOrder
- **Handler**: `handler.getOrder`
- **Trigger**: HTTP GET `/order/{orderId}`
- **Purpose**: Retrieves order details from DynamoDB
- **Environment Variables**:
  - `ORDERS_TABLE`: DynamoDB table name for orders
- **Parameters**: `orderId` (path parameter)
- **Response**: Order details from DynamoDB (pizza, customerId, status, etc.)

### 3. prepOrder
- **Handler**: `handler.prepOrder`
- **Trigger**: SQS Event from `pendingOrderQueue`
- **Purpose**: Processes pending orders from queue and updates order status in DynamoDB
- **Environment Variables**:
  - `ORDERS_TABLE`: DynamoDB table name for orders
- **Configuration**: `batchSize: 1` (processes one message at a time)
- **Flow**: Updates order status to "preparing" or "ready" in DynamoDB

### 4. sendOrder
- **Handler**: `handler.sendOrder`
- **Trigger**: Manual/programmatic invocation
- **Purpose**: Sends processed orders to shipping queue
- **Environment Variables**:
  - `ORDERS_TO_SEND_QUEUE_URL`: URL of orders to send queue
- **Flow**: Moves orders to shipping queue for delivery processing

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

### DynamoDB Tables
1. **Orders**: Main table for storing order data
   - **Primary Key**: `orderId` (String)
   - **Provisioned Throughput**: 1 RCU / 1 WCU

### IAM Permissions
- `sqs:sendMessage` on both SQS queues
- `dynamodb:PutItem`, `dynamodb:GetItem`, `dynamodb:UpdateItem` on Orders table
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
  "@aws-sdk/client-sqs": "included in runtime",
  "@aws-sdk/client-dynamodb": "included in runtime",
  "@aws-sdk/lib-dynamodb": "included in runtime"
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
2. **newOrder** generates UUID, stores in DynamoDB, and sends to `pendingOrderQueue`
3. **prepOrder** is automatically triggered by SQS, processes order and updates status in DynamoDB
4. **sendOrder** can be invoked to move orders to `ordersToSendQueue`
5. **Client** can query order status from DynamoDB with GET `/order/{id}`

## 🔧 Suggested Improvements

- Add schema validation for order data
- Implement robust error handling and retry logic
- Add structured logging with correlation IDs
- Implement unit and integration tests
- Add CloudWatch monitoring and alarms
- Implement order status tracking workflow
- Add API authentication and authorization
- Implement dead letter queues for failed messages

## 👨💻 Author

Alexander Londoño Espejo