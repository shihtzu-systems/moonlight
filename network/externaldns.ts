import * as aws from "@pulumi/aws";
import * as kubernetes from "@pulumi/kubernetes";

import * as kube from "../cluster/kube";


export class ExternalDns {
    namespace: string;
    name: string;

    serviceAccount: kubernetes.core.v1.ServiceAccount;
    clusterRole: kubernetes.rbac.v1.ClusterRole;
    clusterRoleBinding: kubernetes.rbac.v1.ClusterRoleBinding;
    deployment: kubernetes.apps.v1.Deployment;

    constructor(namespace: string, name: string) {
        this.namespace = namespace;
        this.name = name;
    }

    apply(provider: kubernetes.Provider) {
        this.serviceAccount = kube.applyServiceAccount(this.namespace, this.name, provider);
        this.clusterRole = this.applyClusterRole(provider);
        this.clusterRoleBinding = kube.applyClusterRoleBinding(this.namespace, this.name, this.clusterRole, this.serviceAccount, provider);
        this.deployment = this.applyDeployment(provider)
    }

    applyClusterRole(provider: kubernetes.Provider): kubernetes.rbac.v1.ClusterRole {
        return new kubernetes.rbac.v1.ClusterRole(this.name, {
            metadata: {
                name: this.name,
                namespace: this.namespace
            },
            rules: [
                {
                    apiGroups: [
                        "",
                        "extensions",
                    ],
                    resources: [
                        "services",
                        "pods",
                        "ingresses",
                    ],
                    verbs: [
                        "get",
                        "list",
                        "watch",
                    ]
                },
                {
                    apiGroups: [
                        "",
                    ],
                    resources: [
                        "nodes",
                    ],
                    verbs: [
                        "list",
                    ]
                }
            ]
        }, { provider: provider });
    }

    applyDeployment(provider: kubernetes.Provider): kubernetes.apps.v1.Deployment {
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
                        serviceAccountName: this.serviceAccount.metadata.name,
                        containers: [
                            {
                                name: "main",
                                image: "registry.opensource.zalan.do/teapot/external-dns:latest",
                                args: [
                                    "--source=service",
                                    "--source=ingress",
                                    "--provider=aws",
                                    // would prevent ExternalDNS from deleting any records, omit to enable full synchronization
                                    "--policy=upsert-only",
                                    // only look at public hosted zones (valid values are public, private or no value for both)
                                    "--aws-zone-type=public",
                                    "--registry=txt",
                                    `--txt-owner-id=${this.name}`
                                ]
                            }
                        ]
                    }
                }
            }
        }, {provider: provider});
    }

    applyIamPolicy() {
        const policy: aws.iam.PolicyDocument = {
            Version: '2012-10-17',
            Statement: [
                {
                    Effect: "Allow",
                    Action: [
                        "route53:ChangeResourceRecordSets"
                    ],
                    Resource: "arn:aws:route53:::hostedzone/*",
                },
                {
                    Effect: "Allow",
                    Action: [
                        "route53:ListHostedZones",
                        "route53:ListResourceRecordSets"
                    ],
                    Resource: "*",
                }
            ]
        };
        new aws.iam.Policy(this.name, {
            name: this.name,
            policy: JSON.stringify(policy),
        })
    }
}
