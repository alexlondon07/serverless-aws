const { v4: uuidv4 } = require("uuid");
const { SQSClient, SendMessageCommand } = require("@aws-sdk/client-sqs");

const sqsClient = new SQSClient({ region: process.env.AWS_REGION });

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

  const PENDING_ORDER_QUEUE_URL = process.env.PENDING_ORDER_QUEUE_URL;

  const order = { orderId, ...orderDetails };

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
  console.log("Obteniendo detalles de la orden:", JSON.stringify(event));

  const orderId = event.pathParameters?.orderId || "desconocido";

  // Datos simulados
  const orderDetails = {
    pizza: "Pepperoni",
    customerId: "12345",
    order_status: "COMPLETED",
  };

  const order = { orderId, ...orderDetails };

  return {
    statusCode: 200,
    body: JSON.stringify({ message: order }),
  };
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
  return;
};
