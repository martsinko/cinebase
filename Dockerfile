FROM php:8.2-apache

RUN docker-php-ext-install mysqli
RUN a2enmod rewrite

WORKDIR /var/www/html
COPY . .

RUN echo '<Directory /var/www/html>\n\
    AllowOverride All\n\
    Require all granted\n\
</Directory>' >> /etc/apache2/apache2.conf

EXPOSE 80

CMD ["apache2-foreground"]
