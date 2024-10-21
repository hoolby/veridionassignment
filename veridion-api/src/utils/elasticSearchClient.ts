import { Client } from "@elastic/elasticsearch";

const ESClient = new Client({
  node: process.env.ELASTICSEARCH_HOST || "http://localhost:9200",
  auth: {
    username: process.env.ELASTIC_USER || "elastic",
    password: process.env.ELASTIC_PASSWORD || "changeme",
  },
});

export default ESClient;
