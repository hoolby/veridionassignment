import { Client } from "@elastic/elasticsearch";

const ESClient = new Client({
  node: process.env.ELASTICSEARCH_HOST || "http://localhost:9200",
  auth: {
    username: process.env.ELASTIC_USER || "elastic",
    password: process.env.ELASTIC_PASSWORD || "changeme",
  },
});

async function createIndexIfNotExists(indexName: string = "domains") {
  try {
    const indexExists = await ESClient.indices.exists({ index: indexName });
    if (indexExists === true) {
      console.log(`Index "${indexName}" already exists.`);
    } else {
      const response = await ESClient.indices.create({
        index: indexName,
        body: {
          mappings: {
            properties: {
              url: { type: "keyword" },
              company_commercial_name: { type: "text" },
              company_legal_name: { type: "text" },
              company_all_available_names: { type: "text" },
              company_emails: { type: "text" },
              locations: { type: "text" },
              facebook: { type: "keyword" },
              instagram: { type: "keyword" },
              linkedin: { type: "keyword" },
              phone_numbers: { type: "keyword" },
              website_title: { type: "text" },
              website_description: { type: "text" },
              pages_visited: { type: "keyword" },
              last_crawled_date: { type: "keyword" },
              added_date: { type: "keyword" },
            },
          },
        },
      });

      console.log("Index created:", response);
    }
  } catch (error) {
    console.error("Error creating index:", error);
  }
}

// Function to update if document exists, otherwise index
async function updateOrIndexDocument(
  indexName: string,
  domain: string,
  document: Record<string, any>
): Promise<number | null> {
  try {
    // Check if document exists
    const { hits: checkHits } = await ESClient.search({
      index: indexName,
      body: {
        query: {
          term: { url: domain },
        },
      },
    });

    // @ts-expect-error checkHits is possibly undefined
    if (checkHits?.total && checkHits.total?.value > 0) {
      const id = checkHits.hits[0]._id;
      await ESClient.update({
        index: indexName,
        id: id!,
        body: {
          doc: document,
        },
      });
      // Return 1 to indicate document was updated
      return 1;
    } else {
      // If document does not exist, index a new one
      await ESClient.index({
        index: indexName,
        body: document,
      });
      // Return 0 to indicate document was updated
      return 0;
    }
  } catch (error) {
    console.error(
      `Error updating/indexing document for domain: ${domain}`,
      error
    );
    return null;
  }
}

async function bulkIndexDocuments(
  indexName: string = "domains",
  documents: Record<string, any>[]
) {
  try {
    const body = documents.flatMap((doc) => [
      { index: { _index: indexName } },
      doc,
    ]);

    const response = await ESClient.bulk({ refresh: true, body });

    if (response.errors) {
      console.error("Errors occurred during bulk indexing:", response.items);
    } else {
      console.log("Bulk indexing successful:", response);
    }
  } catch (error) {
    console.error("Error during bulk indexing:", error);
  }
}

export { createIndexIfNotExists, updateOrIndexDocument, bulkIndexDocuments };
export default ESClient;
