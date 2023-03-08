# Requests and limits

Here are listed different requests and limits configurations that should be applied to the CPU and memory of CRUD Service in order to reach optimal performances on different scenarios.

:::note
Following these guidelines allows you to bring CRUD Service to an optimal state where:

- performances are not restricted by K8s CPU throttling policies
- the minimum amount of resources are used on the cluster.
:::

Results have been obtained through specific tests implementing a series of requests to the CRUD Service.
Specifically, two APIs have been tested to verify CRUD Service resource consumption:

- `GET /`: used to download a set of data, this has been tested in different scenarios:
 - using an empty collection;
 - using a collection filled with relatively small documents (~500B each) and downloading a full page (200 documents)

- `PATCH /:id`: used to upload a query command to the service, this has been tested in different scenarios:
 - updating a small document by uploading a relatively small payload (~500KB)
 - updating a big document by uploading a relatively big payload (~5MB)

Another scenario has been designed to stress the CRUD Service with a relatively common use-case, having a constant (high) rate of small requests and some spikes with bigger requests (~500KB) (at a smaller rate).

# Scenarios

Each scenario includes multiple categories of users and **the number of requests per second** the CRUD Service can serve for that userbase. 

:::caution note
In order to scale to even higher number of users, we suggest **increasing the number of replicas** and treat each replica as one of the identified user categories.
:::

:::caution note
Some tables show CPU limit values above 1 core, as far as this may make sense in a lab environment, we strongly suggest avoiding this high value limits and prefer horizontally scaling the service (either with static replicas or by using Kubernetes HPA)
:::

## Downloading a full page of data from a collection

:::info
The dataset in the collection holds relatively small documents (~500B each), and each API request
downloads 200 items (~100KB).
:::

:::caution
The memory consumed by the service is directly affected by the document size you wish to interact with. In our scenario ~100KB were lightly affecting 
the required memory, however if you plan to download (or upload) bigger payloads, you should increase the memory limits accordingly to prevent the pod
to reach the memory limit and being killed by Kubernetes.
:::

| Users | Requests Per Second | CPU Requests | CPU Limits | Memory Requests | Memory Limits |
|:-----:|:-------------------:|:------------:|:----------:|:---------------:|:-------------:|
|   50  |          50         |       70     |     500    |         40      |       70      |
|  100  |         100         |      100     |     800    |         40      |       70      |
|  250  |         250         |      200     |     850    |         40      |       70      |
|  500  |         500         |      300     |    1500    |         40      |       70      |

## Uploading a big payload for an operation

This scenario has been designed to stress the service by constantly uploading a 5MB payload to
perform a PATCH operation, while the operation on MongoDB was impacting a single document (to
prevent the Mongo cluster from being the bottleneck) we found that the service wasn't performing
very well and needed to be replicated in order to properly work.

As a result we saw that to properly handle 5 req/s with a constant ~5MB payload upload you need two replicas
of the service with at least the following resource constraints:
  
  - Memory Request: 200
  - Memory Limit: 500
  - CPU Request: 550
  - CPU Limit: 1500

## Constant download with spikes

This scenario has been designed to measure how the service behaves when dealing with a constant and intense traffic with some spikes.

Two tasks were performed by the test:
 - download a full page of small documents (as described in previous scenarios);
 - upload of a medium-sized (0.5MB) payload to perform a PATCH operation.

Of all the requests fired to the service, the two tasks were distributed to be: 75% the first, 25% the second.

| Users | Requests Per Second | CPU Requests | CPU Limits | Memory Requests | Memory Limits |
|:-----:|:-------------------:|:------------:|:----------:|:---------------:|:-------------:|
|   50  |          40         |       500    |    1200    |        100      |      300      |
|  100  |          80         |       500    |    1800    |        100      |      300      |

## Passing through API Gateway

This scenario has been designed to measure the service behavior when the API requests pass through the API Gateway (and Authorization Service, even though no authorization has been set on the API itself). 

The reason for this scenario is that passing through the API Gateway may cause a CPU overhead due the connections being reopened every time, thus leading to higher resource requirements.

If you plan to avoid exposing the CRUD Service directly from the API Gateway this scenario can be ignored.

| Users | Requests Per Second | CPU Requests | CPU Limits | Memory Requests | Memory Limits |
|:-----:|:-------------------:|:------------:|:----------:|:---------------:|:-------------:|
|   50  |          50         |      100     |     700    |         40      |       70      |
|  100  |         100         |      100     |     800    |         40      |       70      |
|  250  |        ~200         |      350     |    1200    |         40      |       70      |
|  500  |        ~250         |      350     |    1500    |         40      |       70      |

