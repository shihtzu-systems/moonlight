import * as kubernetes from "@pulumi/kubernetes";

export function applyServiceAccount(namespace: string,
                                    name: string,
                                    provider: kubernetes.Provider): kubernetes.core.v1.ServiceAccount {
    return new kubernetes.core.v1.ServiceAccount(name, {
        metadata: {
            name: name,
            namespace: namespace
        }
    }, {provider: provider});
}

export function applyClusterRoleBinding(namespace: string,
                                        name: string,
                                        clusterRole: kubernetes.rbac.v1.ClusterRole,
                                        subject: kubernetes.core.v1.ServiceAccount,
                                        provider: kubernetes.Provider): kubernetes.rbac.v1.ClusterRoleBinding {
    return new kubernetes.rbac.v1.ClusterRoleBinding(name, {
        metadata: {
            name: name,
            namespace: namespace
        },
        roleRef: {
            apiGroup: "rbac.authorization.k8s.io",
            kind: clusterRole.kind,
            name: clusterRole.metadata.name,
        },
        subjects: [
            {
                kind: subject.kind,
                name: subject.metadata.name,
                namespace: subject.metadata.namespace,
            }
        ]
    }, {provider: provider });
}
