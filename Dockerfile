FROM ubuntu:24.04

ENV RUST_VERSION 1.74
ENV MDBOOK_QUIZ_VERSION 0.3.3
ENV MDBOOK_VERSION 0.4.34
ENV AQUASCOPE_VERSION 0.3.1
ENV AQUASCOPE_TOOLCHAIN nightly-2023-08-25
ENV PATH "$PATH:/home/ubuntu/bin:/home/ubuntu/.volta/bin:/home/ubuntu/.cargo/bin"

COPY . /opt/rust-book

RUN echo \
  && apt-get update \
  && apt install -y rustup curl wget gcc git nginx \
  && chown -R ubuntu /opt/rust-book

USER ubuntu
WORKDIR /home/ubuntu

RUN echo \
  && rustup set profile minimal \
  && rustup toolchain install ${RUST_VERSION} -c rust-docs \
  && rustup default ${RUST_VERSION} \
  && rustup toolchain install ${AQUASCOPE_TOOLCHAIN} -c rust-src rustc-dev llvm-tools-preview miri \
  && cargo +${AQUASCOPE_TOOLCHAIN} miri setup \
  && export LD_LIBRARY_PATH="$($(rustup which --toolchain ${AQUASCOPE_TOOLCHAIN} rustc) --print target-libdir)"

RUN echo \
  && mkdir -p bin \
  && curl -sSL https://github.com/rust-lang/mdBook/releases/download/v${MDBOOK_VERSION}/mdbook-v${MDBOOK_VERSION}-x86_64-unknown-linux-gnu.tar.gz | tar -xz --directory=bin \
  && curl -sSL https://github.com/cognitive-engineering-lab/mdbook-quiz/releases/download/v${MDBOOK_QUIZ_VERSION}/mdbook-quiz_x86_64-unknown-linux-gnu_full.tar.gz | tar -xz --directory=bin \
  && curl -sSL https://github.com/cognitive-engineering-lab/aquascope/releases/download/v${AQUASCOPE_VERSION}/aquascope-x86_64-unknown-linux-gnu.tar.gz | tar -xz --directory=bin \
  && rustup --version \
  && rustc -Vv \
  && mdbook --version \
  && mdbook-quiz --version \
  && mdbook-aquascope --version

RUN echo \
  && curl -sL https://get.volta.sh | bash \
  && volta install node@18 pnpm

WORKDIR /opt/rust-book/js-extensions

RUN pnpm init-repo

WORKDIR /opt/rust-book

RUN mdbook build

USER root

RUN echo \
  && cp -a /opt/rust-book/book/* /var/www/html/ \
  && rm /-rf /opt/rust-book

# Set the proper mimetype on mjs files else the quiz is not loaded properly
RUN echo \
  && sed -i -e /}/d /etc/nginx/mime.types \
  && echo "application/javascript mjs;" >> /etc/nginx/mime.types \
  && echo '}' >> /etc/nginx/mime.types

WORKDIR /tmp

ENTRYPOINT ["nginx", "-g", "daemon off;"]
