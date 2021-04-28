import { Component, OnInit, HostListener } from '@angular/core';
import { Apollo, QueryRef } from 'apollo-angular';
import { map } from 'rxjs/operators';
import { GlossaryList } from './glossary.graphql';
import { LinearLoaderService } from '../../shared/components/linear-loader/linear-loader.service';
import * as moment from 'moment';
import { ErrorService } from 'src/app/shared/components/error-modal/error.service';
import { UserService } from 'src/app/shared/services/user.service';

@Component({
  selector: 'app-glossary',
  templateUrl: './glossary.component.html',
  styleUrls: ['./glossary.component.scss']
})

export class GlossaryComponent implements OnInit {

  glossaryListData: any;
  glossaryListArray: Array<any>;
  glossaryListPaging: any;
  perPageLimit = 15;
  glossaryListQuery: QueryRef<any>;
  closedGlossaryQuery: QueryRef<any>;
  loadingElements: any = {};
  closedGlossaryList: Array<any>;
  closedGlossaryPaging: any;
  loadClosedGlossary = false;
  // loadingCard = false;
  currentUser: any;
  
  // @HostListener('document:scroll', ['$event'])
  // onScroll(event: any) {
  //   const boundingBox = document.documentElement.getBoundingClientRect();
  //   if ((Math.floor(+boundingBox.height) - window.scrollY) <= window.innerHeight && this.consultationListData && this.consultationListArray) {
  //     this.loadMoreCard();
  //   }
  // }

  constructor(
    private apollo: Apollo, 
    private loader: LinearLoaderService, 
    private errorService: ErrorService,
    private userService: UserService
    ) { }

  ngOnInit() {
    this.checkUserSignedIn();
    this.fetchActiveGlossaryList();
  }

  checkUserSignedIn(){
    this.userService.userLoaded$
    .subscribe((exists: boolean) => {
      if (exists) {
        this.currentUser = this.userService.currentUser;
      }
    },
    err => {
      this.errorService.showErrorModal(err);
    });
  }

  fetchActiveGlossaryList() {
    // this.loadingCard = true;
    const variables = {
      perPage: this.perPageLimit,
      page: 1,
    };
     
    this.glossaryListQuery = this.apollo.watchQuery({query: GlossaryList, variables});
    // this.loader.show();
    // this.loadingElements.consultationList = true;
    this.glossaryListQuery
      .valueChanges 
        .pipe (
          map((res: any) => res.data.glossaryList)
        )
        .subscribe(item => {
            // this.loadingCard = false;
            // this.loadingElements.glossaryList = false;
            this.glossaryListData = item;
            this.glossaryListArray = item.data;
            // this.glossaryListPaging = item.paging;
            // if (!this.glossaryListArray.length || 
            //   (this.glossaryListPaging.currentPage === this.glossaryListPaging.totalPages)) {
            //     this.loadClosedConsultation = true;
            //     // this.fetchClosedConsultationList();
            //   }
        }, err => {
          // this.loadingCard = false;
            this.loadingElements.glossaryList = false;
            this.loader.hide();
            this.errorService.showErrorModal(err);
        });
  }

}
