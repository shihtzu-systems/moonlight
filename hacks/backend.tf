terraform {
  backend "s3" {
    bucket = "shihtzu-moonlight-hack"
    key    = "tfstate"
    region = "us-west-2"
  }
}
