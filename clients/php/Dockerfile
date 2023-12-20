FROM php:7.4.33-fpm

COPY . .

WORKDIR /var/www/html

VOLUME /Volumes/T7/repos/vexilla/clients/client-php /var/www/html

RUN apt-get update
RUN apt-get install git unzip -y
RUN pecl install pcov
RUN cp /usr/local/etc/php/php.ini-development /usr/local/etc/php/php.ini
RUN echo "extension=pcov.so\n" >> /usr/local/etc/php/php.ini

RUN php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');"
RUN php -r "if (hash_file('sha384', 'composer-setup.php') === 'e21205b207c3ff031906575712edab6f13eb0b361f2085f1f1237b7126d785e826a450292b6cfd1d64d92e6563bbde02') { echo 'Installer verified'; } else { echo 'Installer corrupt'; unlink('composer-setup.php'); } echo PHP_EOL;"
RUN php composer-setup.php  --install-dir=/usr/local/bin --filename=composer
RUN php -r "unlink('composer-setup.php');"
# RUN composer install

# RUN curl -v http://localhost:3000/manifest.json

CMD bash
