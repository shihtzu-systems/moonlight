import * as kubernetes from "@pulumi/kubernetes";
import * as fs from 'fs';
import * as traefik from "../observe/traefik";


export class Bingo {
    namespace: string;
    name: string;
    image: string;
    imageTag: string;
    host: string;
    configYaml: string;

    configmap: kubernetes.core.v1.ConfigMap;
    deployment: kubernetes.apps.v1.Deployment;
    service: kubernetes.core.v1.Service;
    ingressRoute: kubernetes.apiextensions.CustomResource;


    constructor(namespace: string, name: string, image: string, imageTag: string, host: string, configYaml: string) {
        this.namespace = namespace;
        this.name = name;
        this.image = image;
        this.imageTag = imageTag;
        this.host = host;
        this.configYaml = configYaml;
    }

    apply(cacheService: kubernetes.core.v1.Service, provider: kubernetes.Provider) {
        this.configmap = this.applyConfigMap(provider);
        this.deployment = this.applyDeployment(cacheService, provider);
        this.service = this.applyService(provider);
        this.ingressRoute = this.applyIngressRoute(provider)
    }

    applyConfigMap(provider: kubernetes.Provider): kubernetes.core.v1.ConfigMap {
        return new kubernetes.core.v1.ConfigMap(this.name, {
            metadata: {
                namespace: this.namespace,
                name: this.name,
                labels: {
                    "app.kubernetes.io/name": this.name
                }
            },
            data: {
                ".bingo.yaml": fs.readFileSync(this.configYaml, "utf-8"),
            }
        }, { provider: provider });
    }

    applyDeployment(cacheService: kubernetes.core.v1.Service, provider: kubernetes.Provider): kubernetes.apps.v1.Deployment {
        return new kubernetes.apps.v1.Deployment(this.name, {
            metadata: {
                namespace: this.namespace,
                name: this.name,
                labels: {
                    "app.kubernetes.io/name": this.name
                }
            },
            spec: {
                replicas: 2,
                selector: {
                    matchLabels: {
                        "app.kubernetes.io/name": this.name
                    }
                },
                template: {
                    metadata: {
                        name: this.name,
                        namespace: this.namespace,
                        labels: {
                            "app.kubernetes.io/name": this.name
                        }
                    },
                    spec: {
                        containers: [
                            {
                                name: "main",
                                image: `${this.image}:${this.imageTag}`,
                                args: ["serve", "--config", "/.bingo.yaml"],
                                env: [
                                    {
                                        //  redis.v1
                                        name: "BINGO_REDIS_V1_ADDRESS",
                                        value: cacheService.metadata.name,
                                    }
                                ],
                                ports: [
                                    {
                                        name: "http",
                                        containerPort: 8080
                                    }
                                ],
                                readinessProbe: {
                                    httpGet: {
                                        port: "http",
                                        path: "/"
                                    }
                                },
                                volumeMounts: [
                                    {
                                        name: `${this.name}-config`,
                                        mountPath: "/.bingo.yaml",
                                        subPath: ".bingo.yaml",
                                    }
                                ]
                            }
                        ],
                        volumes: [
                            {
                                name: `${this.name}-config`,
                                configMap: {
                                    name: this.configmap.metadata.name
                                }
                            }
                        ]
                    }
                }
            }
        }, {provider: provider});
    }

    applyService(provider: kubernetes.Provider): kubernetes.core.v1.Service {
        return new kubernetes.core.v1.Service(this.name, {
            metadata: {
                namespace: this.namespace,
                name: this.name,
                labels: {
                    "app.kubernetes.io/name": this.name
                }
            },
            spec: {
                type: "NodePort",
                selector: {
                    "app.kubernetes.io/name": this.name
                },
                ports: [
                    {
                        name: "http",
                        port: 8080,
                        targetPort: 8080,
                    }
                ],
            },
        }, { provider: provider })
    }

    applyIngressRoute(provider: kubernetes.Provider): kubernetes.apiextensions.CustomResource {
        const matcher = "Host(`"+this.host+"`) && PathPrefix(`/`)";

        return new kubernetes.apiextensions.CustomResource(this.name, {
            apiVersion: `${traefik.ingressRouteGroup}/${traefik.ingressRouteVersion}`,
            kind: traefik.ingressRouteKind,
            metadata: {
                name: this.name,
                namespace: this.namespace
            },
            spec: {
                entryPoints: [
                    "web"
                ],
                routes: [
                    {
                        match: matcher,
                        kind: "Rule",
                        priority: 1,
                        services: [
                            {
                                name: this.service.metadata.name,
                                port: 8080
                            }
                        ]
                    }
                ]
            }
        }, { provider: provider });
    }
}


export class BingoCache {
    namespace: string;
    name: string;
    image: string;
    imageTag: string;

    deployment: kubernetes.apps.v1.Deployment;
    service: kubernetes.core.v1.Service;

    constructor(namespace: string, name: string) {
        this.namespace = namespace;
        this.name = name;
        this.image = "redis";
        this.imageTag = "alpine";
    }

    apply(provider: kubernetes.Provider) {
        this.deployment = this.applyDeployment(provider);
        this.service = this.applyService(provider)
    }

    applyDeployment(provider: kubernetes.Provider): kubernetes.apps.v1.Deployment {
        return new kubernetes.apps.v1.Deployment(this.name, {
            metadata: {
                namespace: this.namespace,
                name: this.name,
                labels: {
                    "app.kubernetes.io/name": this.name
                }
            },
            spec: {
                replicas: 1,
                selector: {
                    matchLabels: {
                        "app.kubernetes.io/name": this.name
                    }
                },
                template: {
                    metadata: {
                        name: this.name,
                        namespace: this.namespace,
                        labels: {
                            "app.kubernetes.io/name": this.name
                        }
                    },
                    spec: {
                        containers: [
                            {
                                name: "main",
                                image: `${this.image}:${this.imageTag}`,
                                ports: [
                                    {
                                        containerPort: 6379
                                    }
                                ],
                                resources: {
                                    requests: {
                                        cpu: "250m",
                                        memory: "500Mi"
                                    }
                                }
                            },
                            {
                                name: "exporter",
                                image: "oliver006/redis_exporter:v1.3.4",
                                ports: [
                                    {
                                        containerPort: 9121
                                    }
                                ],
                                resources: {
                                    requests: {
                                        cpu: "100m",
                                        memory: "100Mi"
                                    }
                                }
                            }
                        ]
                    }
                }
            }
        }, {provider: provider});
    }

    applyService(provider: kubernetes.Provider): kubernetes.core.v1.Service {
        return new kubernetes.core.v1.Service(this.name, {
            metadata: {
                namespace: this.namespace,
                name: this.name,
                labels: {
                    "app.kubernetes.io/name": this.name
                }
            },
            spec: {
                type: "NodePort",
                selector: {
                    "app.kubernetes.io/name": this.name
                },
                ports: [
                    {
                        name: "redis",
                        port: 6379,
                    },
                    {
                        name: "metrics",
                        port: 9121,
                    }
                ],
            },
        }, { provider: provider })
    }
}
