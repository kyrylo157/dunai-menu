-- Bar: tidy names (so volumes of one drink group into one line) and short descriptions.
UPDATE items SET description = 'Класична міцна кава з густою пінкою' WHERE id = 105;
UPDATE items SET description = 'Еспресо з краплею гарячого молока' WHERE id = 106;
UPDATE items SET description = 'Еспресо, розбавлений гарячою водою' WHERE id = 107;
UPDATE items SET description = 'Американо з гарячим молоком' WHERE id = 108;
UPDATE items SET description = 'Еспресо зі збитим молоком і ніжною пінкою' WHERE id = 109;
UPDATE items SET description = 'Кава з ірландським віскі, цукром і вершками' WHERE id = 110;
UPDATE items SET description = 'Гарячий какао з маршмелоу' WHERE id = 111;
UPDATE items SET description = 'Еспресо з великою порцією гарячого молока' WHERE id = 112;
UPDATE items SET description = 'Холодна кава: еспресо, апельсиновий сік, карамельний сироп і лід' WHERE id = 113;
UPDATE items SET description = 'Холодний лате з молоком і льодом' WHERE id = 114;

UPDATE items SET name = 'Чай Rioba 0,3 л', description = 'Чай на ваш вибір' WHERE id = 206;
UPDATE items SET name = 'Чай Rioba 0,5 л', description = 'Чай на ваш вибір' WHERE id = 207;
UPDATE items SET name = 'Чай Rioba заварний 0,7 л', description = 'Листовий чай у чайнику' WHERE id = 208;

UPDATE items SET description = 'Класична кола' WHERE id IN (89, 102, 103);
UPDATE items SET name = 'Pepsi ж/б', description = 'Класична кола' WHERE id = 90;
UPDATE items SET description = 'Класична кола у скляній пляшці' WHERE id = 91;
UPDATE items SET description = 'Газований напій' WHERE id = 92;
UPDATE items SET description = 'Питна вода' WHERE id IN (93, 94);
UPDATE items SET description = 'Домашній освіжаючий лимонад' WHERE id IN (95, 97);
UPDATE items SET description = 'Лимонад з фруктовим сиропом' WHERE id = 96;
UPDATE items SET description = 'Сік на ваш вибір' WHERE id IN (98, 99);
UPDATE items SET description = 'Свіжовичавлений апельсиновий сік' WHERE id = 100;
UPDATE items SET description = 'Домашній компот з ягід і фруктів' WHERE id = 101;
UPDATE items SET description = 'Молоко, морозиво і сироп, збиті до пінки' WHERE id = 104;

UPDATE items SET description = 'Aperol, ігристе вино, содова, долька апельсина' WHERE id = 126;
UPDATE items SET description = 'Безалкогольний: сироп Блю Кюрасао, лимонад, лимон' WHERE id = 127;
UPDATE items SET description = 'Горілка, лікер Блю Кюрасао, лимонад, лимон' WHERE id = 128;
UPDATE items SET description = 'Безалкогольний: лайм, м''ята, цукор, содова' WHERE id = 129;
UPDATE items SET description = 'Білий ром, лайм, м''ята, цукор, содова' WHERE id = 130;
UPDATE items SET name = 'Піна колада б/а', description = 'Безалкогольна: ананасовий сік і кокосові вершки' WHERE id = 131;
UPDATE items SET name = 'Піна колада', description = 'Білий ром, кокосові вершки, ананасовий сік' WHERE id = 132;
UPDATE items SET description = 'Білий ром, сік лайма, цукровий сироп' WHERE id = 133;
UPDATE items SET name = 'Манго-коблер', description = 'Освіжаючий коктейль з манго, цитрусом і подрібненим льодом' WHERE id = 134;
UPDATE items SET description = 'Джин, тонік, лайм' WHERE id = 135;
UPDATE items SET name = 'Текіла санрайз', description = 'Срібна текіла, апельсиновий сік, гренадин' WHERE id = 136;
UPDATE items SET description = 'Горілка, апельсиновий лікер, журавлиновий сік, лайм' WHERE id = 137;
UPDATE items SET name = 'Кривава Мері', description = 'Горілка, томатний сік, лимон, вустерширський соус, табаско, спеції' WHERE id = 138;
UPDATE items SET description = 'Горілка, джин, ром, текіла, апельсиновий лікер, лимон, кола' WHERE id = 139;
UPDATE items SET description = 'Срібна текіла, апельсиновий лікер, сік лайма, сіль на краю келиха' WHERE id = 140;
UPDATE items SET name = 'Кокосовий мохіто', description = 'Білий ром, лікер Malibu, лайм, м''ята, содова' WHERE id = 141;
UPDATE items SET description = 'Джин, Campari, червоний вермут, апельсинова цедра' WHERE id = 142;

UPDATE items SET description = 'Світле пшеничне пиво' WHERE id IN (194, 195);
UPDATE items SET description = 'Світле пиво' WHERE id IN (196, 197);
UPDATE items SET description = 'Світле пиво у пляшці' WHERE id = 198;
UPDATE items SET description = 'Безалкогольне світле пиво' WHERE id = 199;
UPDATE items SET description = 'Світлий пивний напій з фруктовим смаком' WHERE id = 200;
UPDATE items SET description = 'Темне пиво з карамельними нотами' WHERE id IN (201, 202);

UPDATE items SET description = 'Столове вино, біле або червоне' WHERE id IN (174, 175);
UPDATE items SET name = 'Aliko бут.', description = 'Вино, біле або червоне' WHERE id = 176;
UPDATE items SET name = 'Вино на розлив 1 л', description = 'Графин домашнього вина' WHERE id = 177;

UPDATE items SET name = 'Fragolino бут.', description = 'Італійське ігристе з ароматом суниці' WHERE id = 166;
UPDATE items SET name = 'Fragolino ж/б', description = 'Італійське ігристе з ароматом суниці' WHERE id = 172;
UPDATE items SET description = 'Ігристе вино' WHERE id IN (167, 170);
UPDATE items SET description = 'Солодке ігристе вино' WHERE id = 168;
UPDATE items SET description = 'Сухе ігристе вино' WHERE id = 169;
UPDATE items SET description = 'Напівсолодке ігристе вино' WHERE id = 171;
UPDATE items SET description = 'Італійське червоне ігристе, напівсолодке' WHERE id = 173;
UPDATE categories SET name = 'Ігристе' WHERE name = 'Шампанське';

UPDATE items SET name = 'Martini Bianco 1 л', description = 'Білий вермут з ванільними й квітковими нотами' WHERE id = 157;
UPDATE items SET name = 'Martini Bianco 100 мл', description = 'Білий вермут з ванільними й квітковими нотами' WHERE id = 158;

UPDATE items SET description = 'Слабоалкогольний енергетичний напій' WHERE id = 203;
UPDATE items SET description = 'Слабоалкогольний коктейль у пляшці' WHERE id = 204;
UPDATE items SET name = 'Non Stop', description = 'Енергетичний напій' WHERE id = 205;

UPDATE items SET description = 'Українська класична горілка' WHERE id IN (186, 187, 193);
UPDATE items SET description = 'Фінська горілка на льодовиковій воді' WHERE id IN (188, 189, 190, 191);
UPDATE items SET description = 'Корейська рисова горілка, м''яка і легка' WHERE id = 192;

UPDATE items SET description = 'Грузинський бренді, три зірки' WHERE id IN (143, 144);
UPDATE items SET description = 'Грузинський бренді, п''ять зірок' WHERE id IN (145, 146);
UPDATE items SET description = 'Французький коньяк' WHERE id = 147;
UPDATE items SET name = 'Canoni 3* бут.', description = 'Бренді, три зірки' WHERE id = 148;
UPDATE items SET description = 'Бренді, три зірки' WHERE id = 149;
UPDATE items SET description = 'Бренді VS' WHERE id IN (150, 151);
UPDATE items SET description = 'Вірменський бренді, три зірки' WHERE id IN (152, 153);

UPDATE items SET description = 'Ірландський віскі потрійної дистиляції' WHERE id IN (178, 179, 180);
UPDATE items SET description = 'Теннессійський віскі з м''якими карамельними нотами' WHERE id IN (181, 182, 183);
UPDATE items SET name = 'Johnnie Walker Red Label 1 л', description = 'Шотландський купажований віскі' WHERE id = 184;
UPDATE items SET name = 'Johnnie Walker Red Label 50 мл', description = 'Шотландський купажований віскі' WHERE id = 185;

UPDATE items SET description = 'Пряний ром з ванільними нотами' WHERE id IN (159, 160);
UPDATE items SET name = 'Bacardi Carta Negra 50 мл', description = 'Темний ром' WHERE id = 161;
UPDATE items SET name = 'Bacardi Carta Blanca 50 мл', description = 'Білий ром' WHERE id = 162;
UPDATE items SET description = 'Ром' WHERE id = 163;
UPDATE items SET name = 'Oakheart 1 л', description = 'Пряний ром, витриманий у дубових бочках' WHERE id = 164;
UPDATE items SET name = 'Oakheart 50 мл', description = 'Пряний ром, витриманий у дубових бочках' WHERE id = 165;

UPDATE items SET name = 'Beefeater 25 мл', description = 'Лондонський сухий джин' WHERE id = 120;
UPDATE items SET name = 'Beefeater 50 мл', description = 'Лондонський сухий джин' WHERE id = 121;
UPDATE items SET name = 'Beefeater 0,7 л', description = 'Лондонський сухий джин' WHERE id = 122;

UPDATE items SET name = 'Текіла срібна 25 мл', description = 'Срібна текіла' WHERE id = 123;
UPDATE items SET name = 'Текіла срібна 50 мл', description = 'Срібна текіла' WHERE id = 124;
UPDATE items SET name = 'Текіла срібна 1 л', description = 'Срібна текіла' WHERE id = 125;

UPDATE items SET name = 'Jägermeister 50 мл', description = 'Німецький лікер на 56 травах' WHERE id = 154;
UPDATE items SET name = 'Jägermeister 0,5 л', description = 'Німецький лікер на 56 травах' WHERE id = 155;
UPDATE items SET description = 'Чеський трав''яний лікер' WHERE id = 156;
