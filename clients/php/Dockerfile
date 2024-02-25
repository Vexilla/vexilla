ARG PHP_VERSION=8.3

FROM php:$PHP_VERSION-fpm

RUN apt-get update \
    && apt-get install -y git unzip \
    && pecl install pcov \
    && docker-php-ext-enable pcov

COPY --from=composer /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY . .
