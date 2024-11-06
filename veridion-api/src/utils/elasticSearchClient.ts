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
                status: {
                  type: "keyword",
                },

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

                /* METADATA */
                last_job_id: {
                  type: "keyword",
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
                totalDomains: {
                  type: "integer",
                },
                /* domainStatusCounts: {
                  type: "nested",
                }, */
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
      retry_on_conflict: 3,
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

async function getDomainStatusCounts(
  jobId: string | null = null
): Promise<{ success: number; error: number }> {
  try {
    const { aggregations, ...result } = await ESClient.search({
      index: "domains",
      body: {
        query: jobId
          ? {
              term: { last_job_id: jobId },
            }
          : {
              match_all: {},
            },
        aggs: {
          status_counts: {
            terms: {
              field: "status",
              size: 10, // Ensure it returns all possible status values
            },
          },
        },
        size: 0,
      },
    });
    // @ts-expect-error aggregations is possibly undefined
    const counts = aggregations?.status_counts?.buckets.reduce(
      (
        acc: { success: number; error: number },
        bucket: { key: string; doc_count: number }
      ) => {
        if (bucket.key === "SUCCESS") {
          acc.success = bucket.doc_count;
        } else if (bucket.key === "ERROR") {
          acc.error = bucket.doc_count;
        }
        return acc;
      },
      { success: 0, error: 0 }
    );

    return counts || { success: 0, error: 0 };
  } catch (error) {
    console.error(
      `Error fetching domain status counts for job ${jobId}:`,
      error
    );
    return { success: 0, error: 0 };
  }
}

const countSuccess = async () => {
  const response = await ESClient.count({
    index: "domains",
    body: {
      query: {
        match: {
          status: "success", // assuming status is stored in this field
        },
      },
    },
  });
  return response.count;
};

const calculateFillRate = async (field: string) => {
  const totalCount = await ESClient.count({ index: "domains" });

  const filledCountResponse = await ESClient.count({
    index: "domains",
    body: {
      query: {
        bool: {
          must: [{ exists: { field } }],
        },
      },
    },
  });

  return (filledCountResponse.count / totalCount.count) * 100;
};

const getFillRates = async () => {
  const fields = [
    "phone_numbers",
    "facebook",
    "instagram",
    "linkedin",
    "website_title",
    "website_description",
    "company_legal_name",
    "company_all_available_names",
    "company_commercial_name",
    "phone_numbers_from_nlp",
    "locations",
  ];

  const fillRates = await Promise.all(
    fields.map(async (field) => ({
      field,
      fillRate: await calculateFillRate(field),
    }))
  );

  return fillRates;
};

export {
  getFillRates,
  createIndexIfNotExists,
  updateOrIndexDocument,
  bulkIndexDocuments,
  pingES,
  createOrUpdateJob,
  getJobById,
  calculateFillRate,
  updateDomainResult,
  getDomainStatusCounts, // Added export
};
export default ESClient;
