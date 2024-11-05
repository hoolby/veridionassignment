import { Client } from "@elastic/elasticsearch";

const ESClient = new Client({
  node: process.env.ELASTICSEARCH_HOST || "http://localhost:9200",
  auth: {
    username: process.env.ELASTIC_USER || "elastic",
    password: process.env.ELASTIC_PASSWORD || "changeme",
  },
});

async function pingES() {
  ESClient.ping()
    .then(() => {
      console.info("Elasticsearch cluster is up!");
    })
    .catch((err: any) => {
      console.error("Elasticsearch cluster is down!", err);
    });
}
async function createIndexIfNotExists(indexName: "domains" | "jobs") {
  try {
    const indexExists = await ESClient.indices.exists({ index: indexName });
    if (indexExists === true) {
      console.log(`Index "${indexName}" already exists.`);
    } else {
      if (indexName === "domains") {
        const response = await ESClient.indices.create({
          index: indexName,
          body: {
            mappings: {
              properties: {
                /* CRAWL DATA */
                domain: { type: "keyword" },
                valid_url: { type: "text" },

                /* COMPANY NAMES */
                company_commercial_name: { type: "text" },
                company_legal_name: { type: "text" },
                company_all_available_names: { type: "text" },

                /* COMPANY LOCATION */
                locations: { type: "text" },

                /* SOCIAL MEDIA */
                facebook: { type: "keyword" },
                instagram: { type: "keyword" },
                linkedin: { type: "keyword" },
                phone_numbers: { type: "keyword" },
                phone_numbers_by_nlp: { type: "keyword" },

                /* WEBSITE DATA */
                website_title: { type: "text" },
                website_description: { type: "text" },

                /* METADATA */
                last_crawled_date: {
                  type: "date",
                },
                added_date: {
                  type: "date",
                },
              },
            },
          },
        });
        console.log("Index created:", response);
      } else if (indexName === "jobs") {
        const response = await ESClient.indices.create({
          index: indexName,
          body: {
            mappings: {
              properties: {
                status: {
                  type: "keyword",
                },
                result: {
                  type: "nested",
                },
                progress: {
                  type: "integer",
                },
                totalDomains: {
                  type: "integer",
                },
                queuedDomains: {
                  type: "integer",
                },
                successfulDomains: {
                  type: "integer",
                },
                erroredDomains: {
                  type: "integer",
                },
              },
            },
          },
        });
        console.log("Index created:", response);
      }
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
          term: { domain: domain },
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

// Function to create or update a job in the "jobs" index
async function createOrUpdateJob(jobId: string, jobData: Record<string, any>) {
  try {
    await ESClient.update({
      index: "jobs",
      id: jobId,
      body: {
        doc: jobData,
        doc_as_upsert: true,
      },
    });
    console.log(`Job ${jobId} created/updated successfully.`);
  } catch (error) {
    console.error(`Error creating/updating job ${jobId}:`, error);
  }
}

async function getJobById(jobId: string): Promise<any> {
  try {
    const job = await ESClient.get({
      index: "jobs",
      id: jobId,
    });
    return job._source; /* body._source; */
  } catch (error) {
    console.error(`Error fetching job ${jobId}:`, error);
    return null;
  }
}

async function updateDomainResult(domain: string, result: Record<string, any>) {
  try {
    const { hits: checkHits } = await ESClient.search({
      index: "domains",
      body: {
        query: {
          term: { domain: domain },
        },
      },
    });

    // @ts-expect-error checkHits is possibly undefined
    if (checkHits?.total && checkHits.total?.value > 0) {
      const id = checkHits.hits[0]._id;
      await ESClient.update({
        index: "domains",
        id: id!,
        body: {
          doc: result,
        },
      });
      console.log(`Domain ${domain} updated successfully.`);
    } else {
      console.error(`Domain ${domain} not found.`);
    }
  } catch (error) {
    console.error(`Error updating domain ${domain}:`, error);
  }
}

export {
  createIndexIfNotExists,
  updateOrIndexDocument,
  bulkIndexDocuments,
  pingES,
  createOrUpdateJob,
  getJobById,
  updateDomainResult, // Added export
};
export default ESClient;
