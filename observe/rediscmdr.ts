import * as kubernetes from "@pulumi/kubernetes";
import * as aws from "@pulumi/aws";

export class RedisCommander {
    namespace: string;
    name: string;

    deployment: kubernetes.apps.v1.Deployment;

    constructor(namespace: string, name: string) {
        this.namespace = namespace;
        this.name = name;
    }

    apply(elasticacheCluster: aws.elasticache.Cluster, provider: kubernetes.Provider) {
        this.deployment = this.applyDeployment(elasticacheCluster, provider)
    }

    applyDeployment(elasticacheCluster: aws.elasticache.Cluster, provider: kubernetes.Provider): kubernetes.apps.v1.Deployment {
        return new kubernetes.apps.v1.Deployment(this.name, {
            metadata: {
                name: this.name,
                namespace: this.namespace,
                labels: {
                    "app.kubernetes.io/name": this.name
                }
            },
            spec: {
                selector: {
                    matchLabels: {
                        "app.kubernetes.io/name": this.name
                    }
                },
                template: {
                    metadata: {
                        labels: {
                            "app.kubernetes.io/name": this.name
                        }
                    },
                    spec: {
                        containers: [
                            {
                                name: "main",
                                image: "rediscommander/redis-commander",
                                env: [
                                    {
                                        name: "REDIS_HOSTS",
                                        value: elasticacheCluster.clusterAddress,
                                    }
                                ],
                                ports: [
                                    {
                                        name: "web",
                                        containerPort: 8081,
                                    }
                                ]
                            },
                        ],
                    }
                }
            }
        }, {provider: provider});
    }
}
