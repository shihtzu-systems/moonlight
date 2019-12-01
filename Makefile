## -- bright -- ##
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

live-bright:
	pulumi stack select main
	pulumi config set liveBrightImage $(brightImage)
	pulumi config set liveBrightVersion $(brightVersion)
	pulumi config set liveBrightDatestamp $(brightDatestamp)
	pulumi config set liveBrightTimestamp $(brightTimestamp)
	pulumi up --yes

## -- bingo -- ##
bingoImage := shihtzu/bingo
bingoVersion := $(shell cat $$HOME/git/bingo/app.version)
bingoDatestamp := $(shell cat $$HOME/git/bingo/app.datestamp)
bingoTimestamp := $(shell cat $$HOME/git/bingo/app.timestamp)

bingo-stamp:
	make -C $$HOME/git/bingo stamp version=$(bingoVersion)

bingo:
	make -C $$HOME/git/bingo git-master-branch
	make -C $$HOME/git/bingo fmt
	pulumi stack select main
	pulumi config set bingoImage $(bingoImage)
	pulumi config set bingoVersion $(bingoVersion)
	pulumi config set bingoDatestamp $(bingoDatestamp)
	pulumi config set bingoTimestamp $(bingoTimestamp)
	make -C $$HOME/git/bingo git-commit
	make -C $$HOME/git/bingo git-push
	make -C $$HOME/git/bingo push-version-container
	pulumi up --yes

## -- learn - oompa -- ##
oompaImage := shihtzu/oompa
oompaVersion := $(shell cat $$HOME/learn/mastering-distributed-tracing/go/app.version)
oompaDatestamp := $(shell cat $$HOME/learn/mastering-distributed-tracing/go/app.datestamp)
oompaTimestamp := $(shell cat $$HOME/learn/mastering-distributed-tracing/go/app.timestamp)

oompa-stamp:
	make -C $$HOME/learn/mastering-distributed-tracing/go stamp version=$(oompaVersion)

oompa:
	make -C $$HOME/learn/mastering-distributed-tracing/go git-master-branch
	make -C $$HOME/learn/mastering-distributed-tracing/go fmt
	make -C $$HOME/learn/mastering-distributed-tracing/go build
	pulumi stack select main
	pulumi config set oompaImage $(oompaImage)
	pulumi config set oompaVersion $(oompaVersion)
	pulumi config set oompaDatestamp $(oompaDatestamp)
	pulumi config set oompaTimestamp $(oompaTimestamp)
	make -C $$HOME/learn/mastering-distributed-tracing/go git-commit
	make -C $$HOME/learn/mastering-distributed-tracing/go git-push
	make -C $$HOME/learn/mastering-distributed-tracing/go push-version-container
	pulumi up --yes

## -- up -- ##
up:
	pulumi up --yes
