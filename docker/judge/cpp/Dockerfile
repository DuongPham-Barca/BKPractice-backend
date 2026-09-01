FROM alpine:3.22
RUN apk add --no-cache g++ && addgroup -S judge && adduser -S -G judge judge
USER judge
WORKDIR /workspace
