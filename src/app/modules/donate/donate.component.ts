import { Component, OnInit } from '@angular/core';
import { WindowRefService } from '../../shared/services/window-ref.service';
import { environment } from '../../../environments/environment';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-donate',
  templateUrl: './donate.component.html',
  styleUrls: ['./donate.component.scss']
})
export class DonateComponent implements OnInit {
    baseURL: string = "http://localhost:3000/orders"

  constructor(private ref: WindowRefService,
    private http: HttpClient) { }

  ngOnInit(): void {
  }

  order = {
  name: '',
  amount: null,
  contact: null,
  email: null
  }

  order_id=null;
  async order_response(amount: any){

      let order_send: any = {
      "amount": amount*100, // Amount is in currency subunits. Default currency is INR. Hence, 50000 refers to 50000 paise
      "currency": "INR"
      }

      const headers = { 'content-type' : 'application/json', 'responseType' : 'text' }
      const body = JSON.stringify(order_send)
      console.log("body", body);

      let response = await this.http.post( this.baseURL, body,{ 'headers' : headers }).toPromise();
      console.log("response ", response);
      return response["id"];
  }

  getOrder(amount: any) {
  let value = this.order_response(amount);

  console.log("Value", value);
  return value["id"];
  }

  async payWithRazor(donationForm) {
    console.log(donationForm.value);
    let id = await this.order_response(donationForm.value.amount);

    let option: any = {
      "key": "rzp_test_7uFpRekBxdblL5", // Enter the Key ID generated from the Dashboard
      "amount": donationForm.value.amount*100, // Amount is in currency subunits. Default currency is INR. Hence, 50000 refers to 50000 paise
      "currency": "INR",
      "name": "Civis",
      "description": "Test Transaction",
      "image": "https://example.com/your_logo",
      "order_id": id, //This is a sample Order ID. Pass the `id` obtained in the response of Step 1
      "handler": function (response) {
      alert("Payment Successful");
//         alert(response.razorpay_payment_id);
//         alert(response.razorpay_order_id);
//         alert(response.razorpay_signature)
      },
      "prefill": {
        "name": donationForm.value.name,
        "email": donationForm.value.email,
        "contact": donationForm.value.contact
      },
      "theme": {
        "color": "#3399cc"
      }
    };

console.log("oprions ", option);
    let rzp1 = new this.ref.nativeWindow.Razorpay(option);
    rzp1.on('payment.failed', function (response) {
          alert("Payment Failed");

//       alert(response.error.code);
//       alert(response.error.description);
//       alert(response.error.source);
//       alert(response.error.step);
//       alert(response.error.reason);
//       alert(response.error.metadata.order_id);
//       alert(response.error.metadata.payment_id);
    });

    rzp1.open();


}

}
