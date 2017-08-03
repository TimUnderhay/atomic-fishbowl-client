import { Component, Output, EventEmitter, OnInit, OnChanges, AfterViewInit, OnDestroy, ElementRef, ViewChild, ViewChildren, ContentChild, Input, Renderer, ViewContainerRef, QueryList, ViewEncapsulation } from '@angular/core';
import { ToolWidgetCommsService } from './tool-widget.comms.service';
import { Observable }        from 'rxjs/Observable';
import { Subject }           from 'rxjs/Subject';
import { DataService } from './data.service';
import { Collection } from './collection';
import { NwServer } from './nwserver';
import { HostListener } from '@angular/core';
import { ModalService } from './modal/modal.service';
import { AuthenticationService } from './authentication.service';
import { LoggerService } from './logger-service';

@Component( {
  selector: 'tool-widget',
  encapsulation: ViewEncapsulation.None,

//<span *ngIf="refreshed" #infoIcon pTooltip="Query: {{collections[selectedCollection].query}}\nService: {{collections[selectedCollection].nwserverName}}\nImage Limit: {{collections[selectedCollection].imageLimit}}\nMin Dimensions: {{collections[selectedCollection].minX}} x {{collections[selectedCollection].minY}}\nMD5 Hashing: {{collections[selectedCollection].md5Enabled}}\nDistillation Enabled: {{collections[selectedCollection].distillationEnabled}}\nDistillation Terms: {{collections[selectedCollection].distillationTerms}}" tooltipPosition="bottom" escape="true" class="fa fa-info-circle fa-lg fa-fw"></span>

  template: `
<div style="position: relative; top: 0; width: 100%; height: 20px; background-color: rgba(146,151,160,.85); padding: 5px; color: white; font-size: 12px;">
  <div *ngIf="showCollections">
    <div style="position: absolute; top: 7px; width: 100%">
      <span class="noselect">
        <span class="label">Collection:&nbsp;
        <select style="width: 200px;" [(ngModel)]="selectedCollection" (ngModelChange)="collectionSelected($event)">
          <option *ngFor="let collection of collections | mapValues" [ngValue]="collection.id">{{collection.name}}</option>
        </select></span>
        <span #spinnerIcon class="fa fa-refresh fa-spin fa-lg fa-fw" style="display: none;"></span>
        <span #errorIcon class="fa fa-exclamation-triangle fa-lg fa-fw" style="color: yellow; display: none;"></span>
        <span #stopIcon class="fa fa-ban fa-lg fa-fw" style="color: black; display: none;"></span>
        <span (click)="addCollectionClick()" class="fa fa-plus fa-lg fa-fw"></span>
        <span (click)="deleteCollectionClick()" class="fa fa-minus fa-lg fa-fw"></span>
        <span *ngIf="refreshed && selectedCollection && collections" #infoIcon [pTooltip]="buildTooltip()" tooltipPosition="bottom" escape="true" class="fa fa-info-circle fa-lg fa-fw"></span>
      </span>
      <span *ngIf="refreshed && collections[selectedCollection].type == 'fixed'">
        <span class="label">Fixed Collection</span>&nbsp;&nbsp;
        <span class="label">Time1:</span> <span class="value">{{collections[selectedCollection].timeBegin | formatTime}}</span>
        <span class="label">Time2:</span> <span class="value">{{collections[selectedCollection].timeEnd | formatTime}}</span>
        <span class="label">Images:</span> <span class="value">{{imageCount?.images}}</span>
        <span class="label">PDFs:</span> <span class="value">{{imageCount?.pdfs}}</span>
        <span class="label">Total:</span> <span class="value">{{imageCount?.total}}</span>
      </span>
      <span *ngIf="refreshed && collections[selectedCollection].type == 'rolling'">
        <span class="label">Rolling Collection</span>&nbsp;&nbsp;
        <span class="label">Last {{collections[selectedCollection].lastHours}} Hours</span>&nbsp;&nbsp;
        <span class="label">Images:</span> <span class="value">{{imageCount?.images}}</span>
        <span class="label">PDFs:</span> <span class="value">{{imageCount?.pdfs}}</span>
        <span class="label">Total:</span> <span class="value">{{imageCount?.total}}</span>
      </span>
      <span *ngIf="refreshed && collections[selectedCollection].type == 'monitoring'">
        <span class="label">Monitoring Collection</span>&nbsp;&nbsp;
        <span class="label">Images:</span> <span class="value">{{imageCount?.images}}</span>
        <span class="label">PDFs:</span> <span class="value">{{imageCount?.pdfs}}</span>
        <span class="label">Total:</span> <span class="value">{{imageCount?.total}}</span>
      </span>
    </div>
    <div class="noselect" style="position: absolute; right: 160px; top: 2px;">
      <span *ngIf="imageCount.images != 0" [class.fa-deselect]="!showImages" [class.hide]="showSearch" (click)="imageMaskClick()" class="fa fa-file-image-o fa-2x"></span>&nbsp;
      <span *ngIf="imageCount.pdfs != 0" [class.fa-deselect]="!showPdfs" [class.hide]="showSearch" (click)="pdfMaskClick()" class="fa fa-file-pdf-o fa-2x"></span>&nbsp;
      <span *ngIf="imageCount.pdfs != 0" class="fa fa-search fa-2x" (click)="toggleSearch()"></span>
    </div>
  </div>
  <div (click)="addCollectionClick()" style="position: absolute; top: 7px; left: 10px;" *ngIf="showCreateFirstCollection" class="noselect">
    <u>Create your first collection</u>
  </div>
  <div class="noselect" style="position: absolute; right: 10px; top: 2px;">
    <span (click)="preferencesButtonClick()" class="fa fa-cog fa-2x"></span>&nbsp;
    <span (click)="accountsButtonClick()" class="fa fa-users fa-2x"></span>&nbsp;
    <span (click)="helpButtonClick()" class="fa fa-question fa-2x"></span>&nbsp;
    <span (click)="logoutButtonClick()" class="fa fa-sign-out fa-2x"></span>
  </div>
</div>
<div class="noselect" (keydown.escape)="toggleSearch()" *ngIf="showSearch" style="position: absolute; right: 60px; top: 30px; padding: 5px; background-color: rgba(146,151,160,.85); width: 315px; z-index: 100;">
  <input #searchBox type="text" name="searchTerms" [(ngModel)]="searchTerms" (ngModelChange)="searchTermsUpdate()" style="width: 85%;">
  <span [class.fa-deselect]="caseSensitive" class="fa fa-text-height" (click)="toggleCaseSensitivity()" style="color: white;"></span>
  <span class="fa fa-times" (click)="toggleSearch()" style="color: white;"></span>
</div>

<splash-screen-modal></splash-screen-modal>
<add-collection-modal (executeCollection)="collectionExecuted($event)" [modalId]="addCollectionModalId"></add-collection-modal>
<delete-collection-confirm-modal (confirmDelete)="deleteConfirmed()" ></delete-collection-confirm-modal>
<preferences-modal></preferences-modal>
<manage-users-modal></manage-users-modal>
`,

  styles: [`
    .label {
      color: rgb(230,234,234);
      font-size: 13x;
      font-weight: bolder;
    }

    .value {
      color: white;
      font-size: 12px;
      margin-right: 10px;
    }

    .fa-deselect {
      color: black !important;
    }

    .hide {
      display: none;
    }

    .noselect {
      -webkit-touch-callout: none; /* iOS Safari */
      -webkit-user-select: none; /* Safari */
      -khtml-user-select: none; /* Konqueror HTML */
      -moz-user-select: none; /* Firefox */
      -ms-user-select: none; /* Internet Explorer/Edge */
      user-select: none; /* Non-prefixed version, currently supported by Chrome and Opera */
    }


    /*.ui-tooltip {
      width: 375px;
      word-wrap: normal;
    }*/

    .ui-tooltip .ui-tooltip-text {
      white-space: pre-line;
      width: 375px;
    }

  `]
} )

export class ToolWidgetComponent implements OnInit, AfterViewInit {

  ////<tool-widget [imageCount]="imageCount" (caseSensitiveSearchChanged)="toggleCaseSensitiveSearch()" (searchTermsChanged)="searchTermsChanged($event)" (maskChanged)="maskChanged($event)" (deviceNumber)="deviceNumberUpdate($event)"></tool-widget>

  constructor (private dataService : DataService,
               private modalService: ModalService,
               private renderer: Renderer,
               private toolService: ToolWidgetCommsService,
               private authService:AuthenticationService,
               private loggerService: LoggerService ) {}

  private collections: any;
  private selectedCollection: string;
  private addCollectionModalId: string = "add-collection-modal";
  private showCreateFirstCollection: boolean = false;
  private showCollections: boolean = false;
  private showSearch: boolean = false;
  private searchTerms: string;
  private refreshed: boolean = false;

  @ViewChild('spinnerIcon') spinnerIconRef: ElementRef;
  @ViewChild('errorIcon') errorIconRef: ElementRef;
  @ViewChildren('searchBox') searchBoxRef: QueryList<any>;
  private imageCount: any;
  @Output('collectionSelected') collectionSelectedEmitter: EventEmitter<any> = new EventEmitter();
  @Output('pdfMaskChanged') pdfMaskChangedEmitter: EventEmitter<any> = new EventEmitter();
  @Output('imageMaskChanged') imageMaskChangedEmitter: EventEmitter<any> = new EventEmitter();



  ngOnInit() : void {
    this.toolService.imageCount.subscribe( (c: any) => this.imageCount = c );
    this.toolService.reSelectCollection.subscribe( () => this.reSelectCollection() );
    this.dataService.selectedCollectionChanged.subscribe( (e: any) => this.selectedCollection = e.id );
    this.dataService.collectionsChanged.subscribe( (c: string) => {
                                                                    this.collections = c;
                                                                    console.log('collections update', this.collections);
                                                                    //console.log('selectedCollection:', this.selectedCollection);
                                                                  });

    this.dataService.refreshCollections()
                    .then( () => {
                      this.refreshed = true;
                      if (Object.keys(this.collections).length !== 0 ) { //we only select a collection if there are collections
                        this.selectedCollection = this.getFirstCollection();
                        console.log('select collection 0');
                        this.dataService.selectCollection(this.collections[this.selectedCollection])
                          .then( () => this.toolService.deviceNumber.next( { deviceNumber: this.collections[this.selectedCollection].deviceNumber, nwserver:  this.collections[this.selectedCollection].nwserver } ))
                          .then( () => this.showCollections = true );
                      }
                      else {
                        this.showCreateFirstCollection = true;
                      }
                    });

    this.dataService.collectionStateChanged.subscribe( (collection: any) => {
                                                                              //console.log("collection", collection);
                                                                              this.iconDecider(collection.state);
                                                                              this.collections[collection.id].state = collection.state;
                                                                            });
  }

  ngAfterViewInit(): void {
    setTimeout( () => this.modalService.open('splashScreenModal'), 250);
  }

  buildTooltip(): string {
    //console.log("selectedCollection:",this.selectedCollection);
    //console.log("collection:", this.collections[this.selectedCollection]);
    //pTooltip="Query: {{collections[selectedCollection].query}}\nService: {{collections[selectedCollection].nwserverName}}\nImage Limit: {{collections[selectedCollection].imageLimit}}\nMin Dimensions: {{collections[selectedCollection].minX}} x {{collections[selectedCollection].minY}}\nMD5 Hashing: {{collections[selectedCollection].md5Enabled}}\nDistillation Enabled: {{collections[selectedCollection].distillationEnabled}}\nDistillation Terms: {{collections[selectedCollection].distillationTerms}}"
    let tt = "Query: " + this.collections[this.selectedCollection].query;
    tt = tt + "\nService: " + this.collections[this.selectedCollection].nwserverName;
    tt = tt + "\nImage Limit: " + this.collections[this.selectedCollection].imageLimit;
    tt = tt + "\nMin Dimensions: " + this.collections[this.selectedCollection].minX + " x " + this.collections[this.selectedCollection].minY;
    if (this.collections[this.selectedCollection].sha1Enabled) tt = tt + "\nSHA1 Hashing is Enabled";
    if (this.collections[this.selectedCollection].sha256Enabled) tt = tt + "\nSHA256 Hashing is Enabled";
    if (this.collections[this.selectedCollection].md5Enabled) tt = tt + "\nMD5 Hashing is Enabled";
    if (this.collections[this.selectedCollection].distillationEnabled) tt = tt + "\nDistillation is Enabled";
    if (this.collections[this.selectedCollection].distillationEnabled && this.collections[this.selectedCollection].distillationTerms) {
      tt = tt + "\nDistillation Terms:";
      for (let x=0; x < this.collections[this.selectedCollection].distillationTerms.length; x++) {
        tt = tt + "\n  " + this.collections[this.selectedCollection].distillationTerms[x];
      }
    }
    if (this.collections[this.selectedCollection].regexDistillationEnabled) tt = tt + "\nRegEx Distillation is Enabled";
    if (this.collections[this.selectedCollection].regexDistillationEnabled && this.collections[this.selectedCollection].regexDistillationTerms) {
      tt = tt + "\nRegex Distillation Terms:";
      for (let x=0; x < this.collections[this.selectedCollection].regexDistillationTerms.length; x++) {
        tt = tt + "\n  " + this.collections[this.selectedCollection].regexDistillationTerms[x];
      }
    }
    //console.log('tt:',tt);
    return tt;
  }

  private showImages: boolean = true;
  private maskState: any = { showPdf: true, showImage: true};

  imageMaskClick(): void {
    this.showImages = !this.showImages;
    this.maskState.showImage = !this.maskState.showImage;
    //this.maskChanged.emit(this.maskState);
    this.toolService.maskChanged.next(this.maskState);
  }

  private showPdfs: boolean = true;

  pdfMaskClick(): void {
    this.showPdfs = !this.showPdfs;
    this.maskState.showPdf = !this.maskState.showPdf;
    //this.maskChanged.emit(this.maskState);
    this.toolService.maskChanged.next(this.maskState);
  }

  iconDecider(state: string): void {
    //console.log("iconDecider():",state);
    if (state === 'building' || state === 'rolling' || state === 'refreshing') {
      this.showSpinnerIcon();
      this.hideErrorIcon();
    }
    else if (state === 'error') {
      this.hideSpinnerIcon();
      this.showErrorIcon();
    }
    else if (state === 'complete' || state === 'resting') {
      this.hideSpinnerIcon();
      this.hideErrorIcon();
    }
  }

  getFirstCollection(): any { // a bit of a hack since dicts aren't really ordered
    //console.log("getFirstCollection()");
    for (var c in this.collections) {
      console.log(c);
      return c;
    }
  }

  addCollectionClick(): void {
    //console.log("addCollectionClick()");
    this.modalService.open(this.addCollectionModalId);
  }

  preferencesButtonClick(): void {
    //console.log("preferencesButtonClick()");
    this.modalService.open('preferences-modal');
  }

  accountsButtonClick(): void {
    //console.log("preferencesButtonClick()");
    this.modalService.open('accounts-modal');
  }

  helpButtonClick(): void {
    //console.log("helpButtonClick()");
    this.modalService.open('splashScreenModal');
  }


  closeModal(id: string): void {
    console.log("ToolWidgetComponent: closeModal()");
    this.modalService.close(id);
  }



  deleteConfirmed(): void {
    console.log("ToolWidgetComponent: Received deleteConfirmed event");
    this.dataService.abortGetBuildingCollection()
                    .then( () => this.dataService.deleteCollection(this.selectedCollection) )
                    .then( () => this.dataService.refreshCollections() )
                    .then( () => {
                                    this.refreshed = true;
                                    if (Object.keys(this.collections).length === 0 ) {
                                      this.showCreateFirstCollection = true;
                                      this.showCollections = false;
                                      this.dataService.noCollections();
                                    }
                                    else {
                                      this.showCollections = true;
                                      this.selectedCollection = this.getFirstCollection();
                                      console.log('select collection 1');
                                      this.dataService.selectCollection(this.collections[this.selectedCollection])
                                                      .then( () => this.iconDecider(this.collections[this.selectedCollection].state) );
                                    }
                                  });
  }

  deleteCollectionClick(): void {
    //console.log("ToolWidgetComponent: deleteCollectionClick()");
    this.modalService.open('collection-confirm-delete-modal');
  }


/*  editCollectionClick(): void {
    console.log("editCollectionClick()");
  }
*/

/*
  ngOnChanges(): void {
    console.log("ToolWidgetComponent: ngOnChanges()");
  }
*/

  collectionSelected(id: any): void {
    console.log("ToolWidgetComponent: collectionSelected():", this.collections[id]);
    //console.log("collections:", this.collections);
    //console.log(this.collections[id]);
    //console.log("this.selectedCollection:", this.collections[this.selectedCollection]);

    this.dataService.abortGetBuildingCollection();
    if (this.showSearch) {
      this.toggleSearch();
    }

    if (this.collections[id].deviceNumber) {
      this.toolService.deviceNumber.next( { deviceNumber: this.collections[id].deviceNumber, nwserver: this.collections[id].nwserver } );
    }


    if (this.collections[id].type === "rolling" || this.collections[id].type === "monitoring") {
      console.log('select collection 2');
      this.dataService.selectCollection(this.collections[id])
                      .then( () => this.dataService.getRollingCollection(id) );
    }
    else { //fixed collections
      console.log('select collection 3');
      console.log("this.collections[id].state",  this.collections[id].state);
      this.iconDecider(this.collections[id].state);
      if (this.collections[id].state === "building") {
        console.log('select collection 4');
        this.dataService.selectCollection(this.collections[id])
                        .then( () => this.dataService.getBuildingCollection(id) );
        return;
      }
      console.log('select collection 5');
      this.dataService.selectCollection(this.collections[id]);
    }
  }

/*
  getCollectionPosition(id: string): number {
    //for(var i=0; i < this.collections.length; i++) {
    for(var i=0; i < this.dataService.collections.length; i++) {
      let col = this.dataService.collections[i];
      //console.log("id: " + col.id);
      if (col.id === id) {
        return i;
      }
    }
  }
*/

  showSpinnerIcon(): void {
    //console.log("showSpinnerIcon()");
    setTimeout( () => this.renderer.setElementStyle(this.spinnerIconRef.nativeElement, 'display', 'inline-block'), 25 );
  }

  hideSpinnerIcon(): void {
    //console.log("hideSpinnerIcon()");
    this.renderer.setElementStyle(this.spinnerIconRef.nativeElement, 'display', 'none');
  }

  showErrorIcon(): void {
    //console.log("showErrorIcon()");
    this.renderer.setElementStyle(this.errorIconRef.nativeElement, 'display', 'inline-block');
  }

  hideErrorIcon(): void {
    //console.log("hideErrorIcon()");
    setTimeout( () => this.renderer.setElementStyle(this.errorIconRef.nativeElement, 'display', 'none'), 25 );
  }

  getRollingCollection(id: string): void {
    console.log("ToolWidgetComponent: getRollingCollection(id)");
    this.dataService.getRollingCollection(id);
  }

  collectionExecuted(e: any): void {
    let id = e.id;
    console.log("ToolWidgetComponent: collectionExecuted():", id, e);
    //this.collectionSelected(id);
    this.refreshed = false;
    this.dataService.abortGetBuildingCollection()
                    .then( () => this.dataService.refreshCollections() )
                    .then( () => {
                      if (this.collections[id].type === 'fixed') this.dataService.buildCollection(id);
                    })
                    .then( () => this.dataService.refreshCollections() )
                    .then( () => {
                                    this.refreshed = true;
                                    this.selectedCollection = id;
                                    this.showCreateFirstCollection = false;
                                    this.showCollections = true;
                                  })
                    .then( () => this.collectionSelected(id) );
/*
                    .then( () =>  {
                                    if (this.collections[id].type === 'rolling' || this.collections[id].type === 'monitoring') {
                                      console.log('select collection 5');
                                      this.dataService.selectCollection(this.collections[this.selectedCollection])
                                                      .then( () => this.getRollingCollection(id) )
                                                      //.then( () => { this.showCreateFirstCollection = false; this.showCollections = true; })
                                                      .then( () => this.toolService.deviceNumber.next( { deviceNumber: this.collections[this.selectedCollection].deviceNumber } ));
                                    }
                                    else { //fixed collections
                                      console.log('select collection 6');
                                      this.dataService.selectCollection(this.collections[this.selectedCollection])
                                                      .then( () => this.dataService.buildCollection(id) )
                                                      .then( () => this.dataService.getBuildingCollection(id) ) //they're all 'building' when we first execute a collection
                                                      //.then( () => { this.showCreateFirstCollection = false; this.showCollections = true; })
                                                      .then( () => this.toolService.deviceNumber.next( { deviceNumber: this.collections[this.selectedCollection].deviceNumber } ));
                                    }
                                  });
*/
  }

	//@HostListener('window:keydown',['$event']) onEscape(event: KeyboardEvent ) {
	onEscape(event: KeyboardEvent ) {
    //console.log("keyup event:", event);
    if (event.key === 'Escape' && this.showSearch) {
      this.toggleSearch();
    }
	}

  private oldSearchTerms: string;

  toggleSearch(): void {
    this.showSearch = !this.showSearch;
    if (!this.showSearch) {
      this.oldSearchTerms = this.searchTerms;
      this.searchTerms = ''; //set the search terms back to nothing when closing the search bar
      this.searchTermsUpdate();
    }
    else {
      if (this.oldSearchTerms) {
        this.searchTerms = this.oldSearchTerms;
        this.searchTermsUpdate();
      }
      setTimeout( () => this.searchBoxRef.first.nativeElement.focus(), 50); //we use a setTimeout because of a weird timing issue caused by *ngIf.  Without it, .first is undefined
    }
  }

  searchTermsUpdate(): void {
    console.log("ToolWidgetComponent: searchTermsUpdate()", this.searchTerms);
    //this.searchTermsChangedEmitter.emit( { searchTerms: this.searchTerms } );
    this.toolService.searchTermsChanged.next( { searchTerms: this.searchTerms } );
  }

  private caseSensitive: boolean = false;

  toggleCaseSensitivity(): void {
    console.log("ToolWidgetComponent: toggleCaseSensitivity()", this.caseSensitive);
    this.caseSensitive = !this.caseSensitive;
    //this.caseSensitiveSearchChangedEmitter.emit();
    this.toolService.caseSensitiveSearchChanged.next();
  }

  reSelectCollection(): void {
    console.log("ToolWidgetComponent: reSelectCollection()");
    console.log('select collection 7');
    this.dataService.selectCollection(this.collections[this.selectedCollection])
                    .then( () => this.toolService.deviceNumber.next( { deviceNumber: this.collections[this.selectedCollection].deviceNumber, nwserver:  this.collections[this.selectedCollection].nwserver } ))
  }

  logoutButtonClick(): void {
    //console.log("ToolWidgetComponent: logoutButtonClick()");
    this.authService.logout();
  }

}
