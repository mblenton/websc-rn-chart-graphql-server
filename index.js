// @ts-check
const { createServer } = require("http");
const express = require("express");
const { execute, subscribe } = require("graphql");
const { ApolloServer, gql } = require("apollo-server-express");
const { PubSub } = require("graphql-subscriptions");
const { SubscriptionServer } = require("subscriptions-transport-ws");
const { makeExecutableSchema } = require("@graphql-tools/schema");

(async () => {
  const PORT = 4000;
  const pubsub = new PubSub();
  const app = express();
  const httpServer = createServer(app);

  // Schema definition
  const typeDefs = gql`
    type Data {
      id: ID!
      x: Int
      y: Int
    }

    type Query {
      chartData: [Data!]!
    }

    type Subscription {
      chartData: [Data!]!
    }
  `;

  // Resolver map
  const resolvers = {
    Query: {
      chartData() {
        return chartData;
      },
    },
    Subscription: {
      chartData: {
        subscribe: () => pubsub.asyncIterator(["LIVE_CHART_DATA"]),
      },
    },
  };

  const schema = makeExecutableSchema({ typeDefs, resolvers });

  const server = new ApolloServer({
    schema,
  });
  await server.start();
  server.applyMiddleware({ app });

  SubscriptionServer.create(
    { schema, execute, subscribe },
    { server: httpServer, path: server.graphqlPath }
  );

  httpServer.listen(PORT, () => {
    console.log(
      `🚀 Query endpoint ready at http://localhost:${PORT}${server.graphqlPath}`
    );
    console.log(
      `🚀 Subscription endpoint ready at ws://localhost:${PORT}${server.graphqlPath}`
    );
  });

  function randomIntFromInterval(min, max) { // min and max included 
    return Math.floor(Math.random() * (max - min + 1) + min)
  }

  let currentNumber = 0;
  let chartData = [{ id: 0, x: 0, y: 0 }];

  function incrementNumber() { 
    currentNumber++;
    const rndInt = randomIntFromInterval(2, 18);
    chartData.push({ id: currentNumber, x: currentNumber, y: rndInt });
    pubsub.publish("LIVE_CHART_DATA", { chartData } );
    const timeout = setTimeout(incrementNumber, 1500);
    if (currentNumber >= 30) {
      // clearTimeout(timeout);
      currentNumber = 0;
      chartData = [{ id: 0, x: 0, y: 0 }];
    }
  }
  // Start incrementing
  incrementNumber();
})();
