import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { ModalService } from './modal/modal.service';
import { DataService } from './data.service';
import { Subscription } from 'rxjs';
import { Logger } from 'loglevel';
declare var log: Logger;

@Component({
  selector: 'collection-deleted-notify-modal',
  template: `
<modal id="{{id}}" class="confirm-feed-delete-modal">
  <div class="modal">
    <div class="modal-body noselect" style="top: 500px;">

      <div>

        <div style="position: relative;">
          Ever so sorry, but your chosen collection has been deleted by user <b>{{user}}</b>
        </div>

        <div style="float: right; margin-top: 15px;">
          <p-button type="button" (click)="closeModal()" label="OK"></p-button>
        </div>

      </div>

    </div>
  </div>
  <div class="modal-background"></div>
</modal>
  `,
  styles: [`

  .confirm-feed-delete-modal .modal {
      z-index: 1100;
    }

  .confirm-feed-delete-modal .modal-background {
    opacity: 0.85;

    /* z-index must be below .modal and above everything else  */
    z-index: 1050 !important;
  }

  .modal-body {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }

  `]
})

export class CollectionDeletedNotifyModalComponent implements OnInit, OnDestroy {

  constructor(private modalService: ModalService,
              private dataService: DataService  ) {}

  public id = 'collection-deleted-notify-modal';
  private collectionDeletedSubscription: Subscription;
  public user: string = null;

  ngOnInit(): void {
    this.collectionDeletedSubscription = this.dataService.collectionDeleted.subscribe( (user) => {
      this.user = user;
      this.modalService.open(this.id);
    } );
  }

  ngOnDestroy(): void {
    this.collectionDeletedSubscription.unsubscribe();
  }

  onOpen(): void {}


  closeModal(): void {
    this.modalService.close(this.id);
  }

}
