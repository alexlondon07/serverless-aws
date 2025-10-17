const { v4: uuidv4 } = require("uuid");
const { SQSClient, SendMessageCommand } = require("@aws-sdk/client-sqs");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { PutCommand, UpdateCommand, DynamoDBDocumentClient, GetCommand } = require("@aws-sdk/lib-dynamodb");

// create an SQS client
const sqsClient = new SQSClient({ region: process.env.AWS_REGION });

// create a DynamoDB client
const client = new DynamoDBClient({ region: process.env.AWS_REGION });

// Create a DynamoDB client
const docClient = DynamoDBDocumentClient.from(client);

/* Helper function to send a message to SQS */
async function sendMessageToSQS(messageBody, queueUrl) {
  const params = {
    QueueUrl: queueUrl,
    MessageBody: JSON.stringify(messageBody),
  };

  try {
    const command = new SendMessageCommand(params);
    const data = await sqsClient.send(command);
    console.log("Message sent to SQS:", data.MessageId);
    return data;
  } catch (error) {
    console.error("Error sending message to SQS:", error);
    throw error;
  }
}

async function saveItemDinamoDB(item) {

  const params = {
    TableName: process.env.ORDERS_TABLE,
    Item: item
  }

  try {
    const command = new PutCommand(params);
    const data = await docClient.send(command);
    console.log("Item saved to DynamoDB:", data);
    return data;
  } catch (error) {
    console.error("Error saving item to DynamoDB:", error);
    throw error;
  }
}

async function updateStatusInOrder(orderId, status) {
  const params = {
    TableName: process.env.ORDERS_TABLE,
    Key: { orderId },
    UpdateExpression: "set order_status = :newStatus",
    ExpressionAttributeValues: {
      ":newStatus": status,
    },
    ReturnValues: "ALL_NEW",
  };

  try {
    const command = new UpdateCommand(params);
    const response = await docClient.send(command);
    console.log("Item updated succesfully in DynamoDB:", response.Attributes);
    return response;
  } catch (error) {
    console.error("Error updating item in DynamoDB:", error);
    throw error;
  }
}

async function getItemFromDinamoDB(orderId) {
 
  const params = {
    TableName: process.env.ORDERS_TABLE,
    Key: { orderId }
  }

  console.log("params", params);

  try {
    const command = new GetCommand(params);
    const response = await docClient.send(command);

    if(response.Item){

      console.log( "Item get from DynamoDB:", response.Item);
      return response.Item;

    }else {

      console.log("Item not found in DynamoDB:", response.Item);

      let notFoundError = new Error("Item not found in DynamoDB");
      notFoundError.name = "ItemNotFoundException";
      notFoundError.statusCode = 404;
      throw notFoundError;
    }

  } catch (error) {
    console.error("Error getting item from DynamoDB:", error);
    throw error;
  }
}

/* HTTP POST: /order */
exports.newOrder = async (event) => {
  const orderId = uuidv4();
  console.log(`New orden with ID: ${orderId}`);

  let orderDetails;
  try {
    orderDetails = JSON.parse(event.body);
  } catch (error) {
    console.error("Error to parsing date in newOrder method ", error);
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Invalid order data" }),
    };
  }

  console.log("Order details:", orderDetails);

  const order = { orderId, ...orderDetails };

  // Save order in the database
  await saveItemDinamoDB(order);

  // Send message to the queue
  const PENDING_ORDER_QUEUE_URL = process.env.PENDING_ORDER_QUEUE_URL;

  try {
    await sendMessageToSQS(order, PENDING_ORDER_QUEUE_URL);
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Order could not be sent to the queue" }),
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Order successfully placed",
      order,
    }),
  };
};

/* HTTP GET: /order/{orderId} */
exports.getOrder = async (event) => {
  console.log(event);

  const orderId = event.pathParameters.orderId;

  try {
    const order = await getItemFromDinamoDB(orderId);
    console.log("Order details:", order);
    return {
      statusCode: 200,
      body: JSON.stringify(order),
    };
  } catch (error) {
    console.error("Error getting order:", error);

    if(error.name === "ItemNotFoundException"){
      return {
        statusCode: error.statusCode,
        body: JSON.stringify({ message: "order not found" }),
      };
    } else {
      return {
        statusCode: 500,
        body: JSON.stringify({ message: "Error retrieving order" }),
      };
    }
  }
  
};

exports.sendOrder = async (event) => {
  console.log("Valid sendOrder ", JSON.stringify(event));

  const order = {
    orderId: event.orderId,
    pizza: event.pizza,
    customerId: event.customerId
  };

  console.log("Order details to send:", orderDetails);

  const ORDERS_TO_SEND_QUEUE_URL = process.env.ORDERS_TO_SEND_QUEUE_URL;

  try {
    await sendMessageToSQS(order, ORDERS_TO_SEND_QUEUE_URL);
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Order could not be sent to the queue" }),
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Order successfully sent",
      order,
    }),
  };
}

/* SQS Event */
exports.prepOrder = async (event) => {
  console.log("Valid prepOrder ", JSON.stringify(event));

  const body = JSON.parse(event.Records[0].body);
  const orderId = body.orderId;

  await updateStatusInOrder(orderId, "COMPLETED");

  return;
};

