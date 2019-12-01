import * as kubernetes from "@pulumi/kubernetes";
import * as traefik from "../observe/traefik";

export class Oompa {
    namespace: string;
    name: string;
    image: string;
    imageTag: string;
    host: string;

    deployment: kubernetes.apps.v1.Deployment;
    service: kubernetes.core.v1.Service;
    ingressRoute: kubernetes.apiextensions.CustomResource;

    constructor(namespace: string, name: string, image: string, imageTag: string, host: string) {
        this.namespace = namespace;
        this.name = name;
        this.image = image;
        this.imageTag = imageTag;
        this.host = host;
    }

    apply(provider: kubernetes.Provider) {
        this.deployment = this.applyDeployment(provider);
        this.service = this.applyService(provider);
        this.ingressRoute = this.applyIngressRoute(provider)
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
                                        name: "http",
                                        containerPort: 8080
                                    }
                                ],

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

export class OompaData {
    namespace: string;
    name: string;
    image: string;
    imageTag: string;

    deployment: kubernetes.apps.v1.Deployment;
    service: kubernetes.core.v1.Service;

    constructor(namespace: string, name: string) {
        this.namespace = namespace;
        this.name = name;
        this.image = "mysql";
        this.imageTag = "5.6";
    }

    apply(provider: kubernetes.Provider) {
        this.deployment = this.applyDeployment(provider);
        this.service = this.applyService(provider);
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
                                env: [
                                    {
                                        name: "MYSQL_ROOT_USER",
                                        value: "root"
                                    },
                                    {
                                        name: "MYSQL_ROOT_PASSWORD",
                                        value: "secret"
                                    },
                                    {
                                        name: "MYSQL_DATABASE",
                                        value: "oompa"
                                    },
                                    {
                                        name: "MYSQL_USER",
                                        value: "root"
                                    },
                                    {
                                        name: "MYSQL_PASSWORD",
                                        value: "secret"
                                    }
                                ],
                                ports: [
                                    {
                                        name: "mysql",
                                        containerPort: 3306
                                    }
                                ],
                                volumeMounts: [
                                    {
                                        name: "mysql-data",
                                        mountPath: "/var/lib/mysql"
                                    },
                                ]
                            }
                        ],
                        volumes: [
                            {
                                name: "mysql-data",
                                emptyDir: {}
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
                        name: "mysql",
                        port: 3306,
                    }
                ],
            },
        }, { provider: provider })
    }
}
