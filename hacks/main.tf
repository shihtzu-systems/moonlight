

module "kubernetes" {
  source = "./modules/cluster"

  region_name  = var.region_name
  cluster_name = var.cluster_name

  vpc_network_address = var.vpc_network_address

  key_name         = var.key_name
  private_key_path = var.private_key_path

  kubeadm_token   = var.kubeadm_token
}

module "bastion" {
  source = "./modules/bastion"

  region_name  = "y"
  zone_name    = "z"
  bastion_name = "bastion"

  key_name                 = var.key_name
  ingress_primary_cidr     = var.ssh_home_cidr
  ingress_alternative_cidr = var.ssh_remote_cidr

  vpc_id    = module.kubernetes.vpc_id
  subnet_id = module.kubernetes.public_subnets[0]


  private_key_path = var.private_key_path

  key_pair_pem_source      = var.key_pair_pem_source
  key_pair_pem_destination = var.key_pair_pem_destination
  gitlab_password = ""
  gitlab_username = ""
}
