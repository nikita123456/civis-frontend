import { Component, OnInit } from '@angular/core';
import { WindowRefService } from '../../shared/services/window-ref.service';
import { environment } from '../../../environments/environment';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { UserService } from 'src/app/shared/services/user.service';
import { ErrorService } from 'src/app/shared/components/error-modal/error.service';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';


@Component({
  selector: 'app-donate',
  templateUrl: './donate.component.html',
  styleUrls: ['./donate.component.scss']
})
export class DonateComponent implements OnInit {

  constructor(
    private ref: WindowRefService,
    private router: Router,
    private http: HttpClient,
    private errorService: ErrorService,
    private userService: UserService) {
   }

  ngOnInit(): void {
    this.checkUserSignedIn();
  }

  environment = environment;
  currentUser: any;
  order = {
  name: '',
  amount: null,
  contact: null,
  email: null
  }

  checkUserSignedIn(){
      this.userService.userLoaded$
      .subscribe((exists: boolean) => {
        if (exists) {
          this.currentUser = this.userService.currentUser;
          this.order.name = this.currentUser.firstName;
          this.order.email = this.currentUser.email;
        }
      },
      err => {
        this.errorService.showErrorModal(err);
      });
    }

  async order_response(amount: any){
    let order_send: any = { "amount": amount, "currency": "INR" }
    const headers = { 'content-type' : 'application/json', 'responseType' : 'text' }
    const body = JSON.stringify(order_send)

    let response = await this.http.post( this.environment.api + "/orders", body,{ 'headers' : headers }).toPromise();
    return response["id"];
  }

  async payWithRazor(donationForm) {
    let id = await this.order_response(donationForm.value.amount*100);

    let option: any = {
      "key": "rzp_test_7uFpRekBxdblL5",
      "amount": donationForm.value.amount*100,
      "currency": "INR",
      "name": "Civis",
      "description": "Test Transaction",
      "image": "assets/images/navlogo.png",
      "order_id": id,
      "handler": function (response) {
        alert("Payment Successful");
        if(response){
        this.router.navigateByUrl('/');
        }
      }.bind(this),
      "prefill": {
        "name": donationForm.value.name,
        "email": this.currentUser.email,
        "contact": donationForm.value.contact
      },
      "theme": {
        "color": "#3399cc"
      }
    };

    let razorpay = new this.ref.nativeWindow.Razorpay(option);
    razorpay.on('payment.failed', function (response) {
          alert("Payment Failed");
    });
    razorpay.open();
  }
}
