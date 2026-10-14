import test from 'node:test';
import assert from 'node:assert/strict';
import { createOrderPdf } from '../lib/orders/order-pdf.ts';
const order = {
 external_order_id:'ORDER-123',marketplace:{name:'Refurbed'},status:'NEW',ordered_at:null,country_code:'DE',
 customer:{name:'Buyer Example',email:'buyer@example.test'},subtotal:'123.45',shipping_amount:'5.00',tax_amount:'0.00',total_amount:'128.45',currency:'EUR',payment:{is_paid:true},
 shipper:'Carrier',tracking_number:'TRACK-1',tracking_url:null,
 shipping_address:{firstName:'Buyer',lastName:'Example',street:'Test Street 42',postalCode:'12345',city:'Berlin',country:'Germany'},
 billing_address:{company:'Billing Example',street:'Billing Street 24'},
 items:[{title:'Test product',sku:'SKU-1',quantity:2,unit_price:'61.725',currency:'EUR',status:'NEW',condition:'Good'}],
};
test('priced and plain slips contain order data and addresses; plain slip excludes money', async()=>{
 const priced=await createOrderPdf(order,true).text(); const plain=await createOrderPdf(order,false).text();
 for(const pdf of [priced,plain]){assert.ok(pdf.startsWith('%PDF-1.4'));for(const value of ['ORDER-123','Test Street 42','Billing Street 24','SKU-1'])assert.ok(pdf.includes(value));assert.ok(pdf.endsWith('%%EOF'));}
 assert.ok(priced.includes('128.45'));assert.ok(!plain.includes('128.45'));assert.ok(!plain.includes('61.725'));
});
test('large orders create multiple pages',async()=>{const pdf=await createOrderPdf({...order,items:Array.from({length:70},()=>order.items[0])}).text();assert.match(pdf,/\/Count [2-9]/);});
