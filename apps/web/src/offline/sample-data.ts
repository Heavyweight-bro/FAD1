export const SAMPLE_1C_DATA = {
  Организация_Наименование: 'Done Ukraine LLC',
  Организация_ЮрАдрес: 'Kyiv, Ukraine',
  ИНН: '1234567890',
  Организация_Телефон: '+380 44 000 00 00',
  Организация_EMAIL: 'finance@done.ua',

  Контрагент_Наименование: 'Guangzhou Example Supplier Co., Ltd.',
  Контрагент_ЮрАдрес: 'Guangzhou, CN',
  Контрагент_IBAN: 'CN00 0000 0000 0000 0000 0000',
  Контрагент_Bank: 'Bank of Example',
  Контрагент_SWIFT: 'EXAMCN00',
  Контрагент_BankAddress: 'Guangzhou, China',

  ВходящийДокумент_Номер: 'INV-0001',
  ВходящийДокумент_Дата_Анг: '2026-04-25',
  Итого_Сумма: 1250.5,
  Валюта: 'USD',
  Payment_terms: '30 days',

  УсловиеПоставки: 'FOB',
  МестоПоставки_Анг: 'Guangzhou',
  POL: 'Guangzhou',
  POD: 'Odesa',
  'B/L No.': 'BL-123',
  ДатаКоносамента: '2026-04-20',
  'Container No.': 'CONT-001',

  Отправитель: 'Shipper Example',

  Строки: [
    {
      Строка_НоменклатураНаименованиеПолноеАнг: 'T-shirt, cotton, white',
      Строка_ЕдИзмер_Анг: 'pcs',
      Строка_Количество: 100,
      Строка_Цена: 5.5,
      Строка_Сумма: 550,
      Строка_СтранаПроисхожденияНоменклатуры: 'CN',
    },
    {
      Строка_НоменклатураНаименованиеПолноеАнг: 'Jeans, denim, blue',
      Строка_ЕдИзмер_Анг: 'pcs',
      Строка_Количество: 50,
      Строка_Цена: 14.01,
      Строка_Сумма: 700.5,
      Строка_СтранаПроисхожденияНоменклатуры: 'CN',
    },
  ],
};

export const SAMPLE_TEMPLATE_HTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Invoice {{invoice_number}}</title>
    <style>
      @page { size: A4; margin: 10mm; }
      * { box-sizing: border-box; }
      body {
        width: 190mm; max-width: 190mm; margin: 0 auto;
        font-family: Arial, sans-serif; font-size: 9px; line-height: 1.3; color: #000;
      }
      header { display: flex; justify-content: space-between; gap: 16px; }
      .box { border: 1px solid #111; padding: 8px; border-radius: 6px; }
      table { width: 100%; border-collapse: collapse; table-layout: fixed; }
      th, td { border: 1px solid #111; padding: 4px; word-wrap: break-word; }
      th { background: #f3f4f6; }
      .muted { color: #444; }
    </style>
  </head>
  <body>
    <header>
      <div class="box" style="flex: 1">
        <div style="font-size: 12px; font-weight: 700">{{seller_name}}</div>
        <div class="muted">{{seller_address}}</div>
        <div style="margin-top: 6px"><b>Bank:</b> {{bank_name}} / {{swift_code}}</div>
        <div><b>Account:</b> {{account_number}}</div>
      </div>
      <div class="box" style="width: 70mm">
        <div style="font-size: 12px; font-weight: 700">INVOICE</div>
        <div><b>No:</b> {{invoice_number}}</div>
        <div><b>Date:</b> {{invoice_date}}</div>
        <div style="margin-top: 6px"><b>Terms:</b> {{payment_terms}}</div>
      </div>
    </header>

    <section class="box" style="margin-top: 10px">
      <div style="font-weight: 700">Bill To</div>
      <div>{{buyer_name}}</div>
      <div class="muted">{{buyer_address}}</div>
      <div class="muted">VAT: {{buyer_vat}}</div>
    </section>

    <section style="margin-top: 10px">
      <table>
        <thead>
          <tr>
            <th style="width: 6%">#</th>
            <th style="width: 54%">Description</th>
            <th style="width: 10%">Unit</th>
            <th style="width: 10%">Qty</th>
            <th style="width: 10%">Price</th>
            <th style="width: 10%">Amount</th>
          </tr>
        </thead>
        <tbody>
          {{#each items}}
          <tr>
            <td>{{this.number}}</td>
            <td>{{this.description}}</td>
            <td>{{this.unit}}</td>
            <td>{{this.quantity}}</td>
            <td>{{this.unit_price}}</td>
            <td>{{this.amount}}</td>
          </tr>
          {{/each}}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="5" style="text-align: right"><b>Total</b></td>
            <td><b>{{currency}} {{total_amount}}</b></td>
          </tr>
        </tfoot>
      </table>
    </section>

    <section class="box" style="margin-top: 10px; display: flex; gap: 12px">
      <div style="flex: 1">
        <div style="font-weight: 700">Delivery</div>
        <div>{{delivery_term}} — {{delivery_place}}</div>
        <div class="muted">POL: {{port_of_loading}} | POD: {{port_of_discharge}}</div>
      </div>
      <div style="width: 70mm">
        <div style="font-weight: 700">Shipping</div>
        <div class="muted">B/L: {{bl_number}}</div>
        <div class="muted">Container: {{container_number}}</div>
      </div>
    </section>
  </body>
</html>`;

