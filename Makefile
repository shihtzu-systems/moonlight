brightImage := shihtzu/bright
brightVersion := $(shell cat $$HOME/git/bright/app.version)
brightDatestamp := $(shell cat $$HOME/git/bright/app.datestamp)
brightTimestamp := $(shell cat $$HOME/git/bright/app.timestamp)

bright-stamp:
	make -C $$HOME/git/bright stamp version=$(brightVersion)

bright:
	make -C $$HOME/git/bright git-master-branch
	make -C $$HOME/git/bright fmt
	pulumi stack select main
	pulumi config set brightImage $(brightImage)
	pulumi config set brightVersion $(brightVersion)
	pulumi config set brightDatestamp $(brightDatestamp)
	pulumi config set brightTimestamp $(brightTimestamp)
	make -C $$HOME/git/bright git-commit
	make -C $$HOME/git/bright git-push
	make -C $$HOME/git/bright push-version-container
	pulumi up --yes

up:
	pulumi up --yes
