FROM alpine:3.22
RUN apk add --no-cache gcc musl-dev && addgroup -S judge && adduser -S -G judge judge
USER judge
WORKDIR /workspace
