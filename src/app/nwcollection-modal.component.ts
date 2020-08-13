import { Component, OnInit, OnDestroy, ViewChild, ViewChildren, QueryList, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { DataService } from 'services/data.service';
import { ToolService } from 'services/tool.service';
import { ModalService } from './modal/modal.service';
import { NgForm } from '@angular/forms';
import { UUID } from 'angular2-uuid';
import { defaultNwQueries } from './default-nw-queries';
import { ContentTypes } from 'types/contenttypes';
import { UseCase } from 'types/usecase';
import { SelectItem } from 'primeng/api/selectitem';
import { Subscription } from 'rxjs';
import { NwServer, NwServers } from 'types/nwserver';
import { Feed } from 'types/feed';
import { CollectionMeta } from 'types/collection-meta';
import { Collection } from 'types/collection';
import { Preferences } from 'types/preferences';
import * as utils from './utils';
import { COLLECTION_MODES, HASHING_MODES } from 'types/add-collection-modes';
import dayjs from 'dayjs';
import * as log from 'loglevel';


@Component({
  selector: 'nw-collection-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './nwcollection-modal.component.html'
})

export class NwCollectionModalComponent implements OnInit, OnDestroy {

  constructor(private dataService: DataService,
              private toolService: ToolService,
              private modalService: ModalService,
              private changeDetectionRef: ChangeDetectorRef) {}

  @ViewChild('addCollectionForm', { static: true }) addCollectionForm: NgForm;
  @ViewChildren('nwNameBox') nameBoxRef: QueryList<any>;

  id = this.toolService.nwCollectionModalId;
  hashTooltip = 'This is used to find suspicious executables that match a certain hash pattern.  It presently works with Windows and Mac executables.  It also supports executables contained within ZIP or RAR archives.  This will not limit the display of other types of content pulled in from the query.  If found, a tile will be displayed with the hash value and an optional friendly name which can be specified by using CSV syntax of hashValue,friendlyIdentifier';

  modes = COLLECTION_MODES;
  mode = this.modes.add; // can be add, editRolling, editFixed, or adhoc
  private defaultCollectionQuery = '';
  private defaultCollectionType = 'rolling';
  contentTypes = ContentTypes;
  private defaultUseCaseBinding = 'bound';
  showUseCaseValues = false; // used to switch input controls to readonly mode.  true = readonly mode
  collection: any;
  testError = '';
  timeBegin: Date = new Date();
  timeEnd: Date = new Date();

  name = '';
  nameValid = false;
  nameInvalidMessage = '';
  type = this.defaultCollectionType;
  lastHours = 1;
  selectedUseCase = null;
  useCaseBinding = this.defaultUseCaseBinding;
  selectedContentTypes = [];
  contentLimit = null;
  minX = null;
  minY = null;
  distillationEnabled = false;
  distillationTerms = '';
  regexDistillationEnabled = false;
  regexDistillationTerms = '';
  regexDistillationTooltipText = `Uses perl-style regular expressions.

  Only match functionality is supported.

  Perl-style modifiers such as 'i' for case-insensitivity are NOT supported.

  Search only words, and do not use beginning or end of line metacharacters (e.g. '^' or '$').

  Note that multi-word matches may or may not work, depending on how the document was laid out internally and how the text is generated by 'pdftotext'.`;
  sha1Enabled = false;
  sha1Hashes = '';
  sha256Enabled = false;
  sha256Hashes = '';
  md5Enabled = false;
  md5Hashes = '';
  okButtonText = '';



  queryInputText = '';
  queryList = defaultNwQueries;
  private queryListObj = {};
  queryListOptions: SelectItem[] = [];

  selectedQuery = this.queryList[2].text;
  private preferences: any;
  private timeframes: any = ['Last 5 Minutes', 'Last 10 Minutes', 'Last 15 Minutes', 'Last 30 Minutes', 'Last Hour', 'Last 3 Hours', 'Last 6 Hours', 'Last 12 Hours', 'Last 24 Hours', 'Last 48 Hours', 'Last 5 Days (120 Hours)', 'Today', 'Yesterday', 'This Week', 'Last Week', 'Custom'];
  timeframeOptions: SelectItem[] = [];
  selectedTimeframe = 'Last Hour';
  displayCustomTimeframeSelector = false;
  private firstRun = true;
  hashInfoText = `Matches on executables.<br><br>
  Case-insensitive.<br><br>
  May be in CSV format<br>
  (<b>hash,friendlyName</b>),<br>
  or a hash value only.<br><br>
  One item per-line.`;

  useCases: UseCase[];
  useCasesObj = {};
  useCaseOptions: SelectItem[] = [];
  displayUseCaseDescription = false;
  useCaseDescription = '';

  imagesEnabled = false;
  pdfsEnabled = false;
  officeEnabled = false;
  dodgyArchivesEnabled = false;
  hashesEnabled = false;

  private editingCollectionId: string;
  private editingCreator: CollectionMeta;
  thumbClass = '';
  disableBindingControls = false;
  testInProgress = false;
  private reOpenTabsModal = false;

  private feeds = {};
  hashingModes = HASHING_MODES;
  hashingMode = this.hashingModes.feed;
  feedOptions: SelectItem[] = [];
  selectedFeed: Feed;
  private hashFeedId: string;

  private executeCollectionOnEdit = false;

  private collectionNames = {};
  private origName: string = null;

  private adhocParams: any;

  onlyContentFromArchives = false;


  // API Servers
  addingService = true; // if true, we're adding a service.  If false, we're editing a service
  // selectedApiServerId = '';
  selectedApiServer: NwServer;
  apiServers: NwServers = {};
  apiServersOptions: SelectItem[];
  private setThisApiServerIdOnNextPick: string;


  // Subscriptions
  private subscriptions = new Subscription;




  ngOnInit(): void {

    log.debug('NwCollectionModalComponent: ngOnInit()');

    for (let i = 0; i < this.queryList.length; i++) {
      this.queryListObj[this.queryList[i].text] = this.queryList[i];
      let option: any = {};
      option['label'] = this.queryList[i].text;
      option['value'] = this.queryList[i].text;
      this.queryListOptions.push(option);
    }

    this.subscriptions.add(this.toolService.reOpenTabsModal.subscribe( (TorF) => this.reOpenTabsModal = TorF ));

    // Preferences changed subscription
    this.subscriptions.add(this.dataService.preferencesChanged.subscribe( (prefs: Preferences) => this.onPreferencesChanged(prefs) ));

    this.subscriptions.add(this.dataService.useCasesChanged.subscribe( (o: any) => this.onUseCasesChanged(o) ));

    // Add collection next subscription
    this.subscriptions.add(this.toolService.addNwCollectionNext.subscribe( () => this.onAddCollectionNext() ));

    // Edit collection next subscription
    this.subscriptions.add(this.toolService.editNwCollectionNext.subscribe( (collection: Collection) => this.onEditCollectionNext(collection) ));

    this.subscriptions.add(this.dataService.feedsChanged.subscribe( (feeds: Feed[]) => this.onFeedsChanged(feeds) ));

    this.subscriptions.add(this.toolService.executeCollectionOnEdit.subscribe( TorF => this.executeCollectionOnEdit = TorF));

    this.subscriptions.add(this.dataService.collectionsChanged.subscribe( (collections: any) => this.onCollectionsChanged(collections) ));

    this.subscriptions.add(this.toolService.addNwAdhocCollectionNext.subscribe( (params: any) => this.onAdhocCollectionNext(params) ));

    this.subscriptions.add(this.dataService.nwServersChanged.subscribe( (apiServers: NwServers) => this.onApiServersChanged(apiServers) ));

    this.timeframes.forEach(timeframe => {
      let item: SelectItem = { label: timeframe, value: timeframe};
      this.timeframeOptions.push(item);
    });

  }



  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }



  ////////////// Subscription Handlers //////////////



  onPreferencesChanged(prefs: Preferences): void {
    log.debug('NwCollectionModalComponent: onPreferencesChanged(): prefs observable: ', prefs);

    if (Object.keys(prefs).length === 0) {
      return; // this handles a race condition where we subscribe before the getPreferences call has actually run
    }
    this.preferences = prefs;

    // We can update this every time
    if ( 'presetQuery' in prefs.nw ) {
      this.defaultCollectionQuery = prefs.nw.presetQuery;
      // this.queryInputText = prefs.presetQuery;
    }

    if (this.firstRun) { // we only want to update these the first time we open.  After that, leave them alone, as we don't want the user to have to change them every time he opens the window.  In other words, leave the last-used settings for the next time the user opens the modal

      if ( 'defaultQuerySelection' in prefs.nw ) {
        for (let i = 0; i < this.queryList.length; i++) {
          let query = this.queryList[i];
          if (query.text === prefs.nw.defaultQuerySelection) {
            log.debug('NwCollectionModalComponent: onPreferencesChanged(): setting query selector to ', query);
            this.selectedQuery = query.text; // changes the query in the query select box dropdown
            this.queryInputText = query.queryString; // changes the query string in the query string input
            break;
          }
        }
      }
      if ( 'minX' in prefs && 'minY' in prefs ) {
        this.minX = prefs.minX;
        this.minY = prefs.minY;
      }
      if ( 'defaultContentLimit' in prefs ) {
        this.contentLimit = prefs.defaultContentLimit;
      }
      if ( 'defaultRollingHours' in prefs ) {
        this.lastHours = prefs.defaultRollingHours;
      }
      if ( 'presetQuery' in prefs.nw && prefs.nw.defaultQuerySelection === 'Default Query' ) {
        this.selectedQuery = 'Preset Query';
        this.queryInputText = prefs.nw.presetQuery; // changes the query string in the query string input
      }
    }

    this.firstRun = false;
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }



  onCollectionsChanged(collections: any): void {
    if (Object.keys(collections).length === 0) {
      return;
    }
    let temp = {};
    for (let c in collections) {
      if (collections.hasOwnProperty(c)) {
        let collection = collections[c];
        temp[collection.name] = null;
      }
    }
    this.collectionNames = temp;
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }



  onFeedsChanged(feeds: Feed[]): void {
    if (Object.keys(feeds).length === 0) {
      return;
    }
    log.debug('NwCollectionModalComponent: onFeedsChanged(): feeds', feeds);
    let feedOptions: SelectItem[] = [];
    for (let i in feeds) {
      if (feeds.hasOwnProperty(i)) {
        let feed = feeds[i];
        let name = feed.name;
        feedOptions.push( { label: name, value: feed } );
      }
    }
    this.feeds = feeds;
    this.feedOptions = feedOptions;

    if (this.hashFeedId && this.hashFeedId in feeds) {
      this.selectedFeed = this.feeds[this.hashFeedId];
    }
    else {
      this.selectedFeed = this.feedOptions[0].value;
    }
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }



  onUseCasesChanged(o: any): void {
    if (Object.keys(o).length === 0) {
      return;
    }
    log.debug('NwCollectionModalComponent: onUseCasesChanged(): o', o);
    this.useCases = o.useCases;
    this.useCasesObj = o.useCasesObj;
    let useCaseOptions: SelectItem[] = [];
    useCaseOptions.push( { label: 'Custom', value: 'custom' } );
    for (let i = 0; i < this.useCases.length; i++) {
      useCaseOptions.push( { label: this.useCases[i].friendlyName, value: this.useCases[i].name } );
    }
    this.useCaseOptions = useCaseOptions;
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }






  /////////// Form Events ///////////




  onDistillationChecked() {
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }



  onNameChanged(name: string): void {
    // log.debug(`NwCollectionModalComponent: onNameChanged(): name: "${name}"`);

    if (name.length === 0) {
      this.nameValid = false;
      this.nameInvalidMessage = 'The name field is required';
    }
    else if (name.length !== 0 && !(name in this.collectionNames) || (this.mode === this.modes.editRolling && name === this.origName))  {
      this.nameValid = true;
    }
    else {
      this.nameValid = false;
      this.nameInvalidMessage = 'A collection with this name already exists';
    }
  }



  onQuerySelected(detectChanges = true): void {
    // log.debug('NwCollectionModalComponent: onQuerySelected(): e', e);
    if (this.selectedQuery === 'Default Query') {
      this.queryInputText = this.defaultCollectionQuery;
    }
    else {
      this.queryInputText = this.queryListObj[this.selectedQuery].queryString;
    }
    if (detectChanges) {
      this.changeDetectionRef.markForCheck();
      this.changeDetectionRef.detectChanges();
    }
  }



  timeframeSelected(e: any): void {
    if (this.selectedTimeframe === 'Custom') {
      // display custom timeframe selector
      this.displayCustomTimeframeSelector = true;
    }
    else {
      this.displayCustomTimeframeSelector = false;
    }
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }



  timeframeClicked() {
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }



  onAddNwServiceClicked(): void {
    this.addingService = true; // set mode to adding
    this.changeDetectionRef.detectChanges();
    this.modalService.open(this.toolService.newEditNwServiceModalId);
  }



  onClose(): void {
    log.debug('NwCollectionModalComponent: onClose()');
    if (this.mode === this.modes.editRolling || this.mode === this.modes.editFixed) {
      this.name = '';
      this.changeDetectionRef.markForCheck();
      this.changeDetectionRef.detectChanges();
    }
    if (this.reOpenTabsModal) {
      this.modalService.open(this.toolService.tabContainerModalId);
    }
  }



  close(): void {
    log.debug('NwCollectionModalComponent: close()');
    this.modalService.close(this.id);
    if (this.okButtonText === 'Save') {
      this.modalService.open(this.toolService.tabContainerModalId);
    }
  }



  onCollectionSubmit(f: NgForm): void {
    // log.debug('NwCollectionModalComponent: onCollectionSubmit()');
    const time = <number>(Math.round( <any>(new Date()) / 1000) );

    let newCollection: Collection = {
      id: UUID.UUID(), // overridden later if editing collection
      name: this.name,
      type: this.type,
      state: 'initial',
      nwserver: this.selectedApiServer.id,
      nwserverName: this.selectedApiServer.friendlyName,
      // query: null,
      // contentTypes: null,
      contentLimit: this.contentLimit,
      deviceNumber: this.selectedApiServer.deviceNumber,
      bound: false, // may get overridden later
      usecase: 'custom', // may get overridden later
      // minX: this.minX,
      // minY: this.minY,
      // distillationEnabled: null,
      // regexDistillationEnabled: null,
      // useHashFeed: null,
      onlyContentFromArchives: this.onlyContentFromArchives,
      executeTime: time,
      serviceType: 'nw'
    };

    if (this.selectedUseCase !== 'custom' && this.useCaseBinding === 'bound') {
      // An OOTB use case is selected and is bound
      newCollection.usecase = this.selectedUseCase;
      newCollection.bound = true;

      for (let i = 0; i < this.useCases.length; i++) {
        // set minX and minY if the use case uses images
        let thisUseCase = this.useCases[i];
        let outerBreak = false;

        if (thisUseCase.name === newCollection.usecase) {
          let contentTypes = thisUseCase.contentTypes;
          for (let x = 0; x < contentTypes.length; x++) {
            if ( contentTypes[x] === 'images') {
              newCollection.minX = this.minX;
              newCollection.minY = this.minY;
              outerBreak = true;
              break;
            }
          }
          if (outerBreak) {
            break;
          }
        }
      }
    }
    else {
      // We either have a custom use case or an unbound use case
      newCollection.query = this.queryInputText;

      if (this.mode === this.modes.adhoc) {
        log.debug('NwCollectionModalComponent: onCollectionSubmit(): queryInputText:', this.queryInputText);
        let query = this.queryInputText;

        if ('host' in this.adhocParams) {
          query = query + ' && alias.host contains \'' + this.adhocParams['host'] + '\'';
        }
        if ('ip' in this.adhocParams && this.adhocParams['side'] === 'src') {
          query = query + ' && ip.src = ' + this.adhocParams['ip'];
        }
        if ('ip' in this.adhocParams && this.adhocParams['side'] === 'dst') {
          query = query + ' && ip.dst = ' + this.adhocParams['ip'];
        }
        if ('adUser' in this.adhocParams && this.adhocParams['side'] === 'src') {
          query = query + ' && ad.username.src = ' + '\'' + this.adhocParams['adUser'] + '\'';
        }
        if ('adUser' in this.adhocParams && this.adhocParams['side'] === 'dst') {
          query = query + ' && ad.username.dst = ' + '\'' + this.adhocParams['adUser'] + '\'';
        }
        log.debug('NwCollectionModalComponent: onCollectionSubmit(): query:', query);
        newCollection.query = query;
      }

      newCollection.distillationEnabled = this.distillationEnabled;
      newCollection.regexDistillationEnabled = this.regexDistillationEnabled;
      newCollection.contentTypes = this.selectedContentTypes;

      for (let i = 0; i < newCollection.contentTypes.length; i++) {
        let type = newCollection.contentTypes[i];
        if (type === 'images') {
          newCollection.minX = this.minX;
          newCollection.minY = this.minY;
        }
      }

      if (!newCollection.bound && this.hashesEnabled && this.hashingMode === this.hashingModes.manual) {
        newCollection.useHashFeed = false;
        newCollection.md5Enabled = this.md5Enabled;
        newCollection.sha1Enabled = this.sha1Enabled;
        newCollection.sha256Enabled = this.sha256Enabled;
      }
      if (!newCollection.bound && this.hashesEnabled && this.hashingMode === this.hashingModes.feed && this.selectedFeed) {
        newCollection.useHashFeed = true;
        newCollection.hashFeed = this.selectedFeed.id;
      }
    }

    if ( this.type === 'rolling' ) {
      newCollection.lastHours = this.lastHours;
    }
    else if ( this.type === 'fixed' ) {
      let t: any = {};
      if (this.selectedTimeframe === 'Custom') {
        t = utils.convertCustomTimeSelection(this.timeBegin, this.timeEnd);
      }
      else {
        t = utils.convertTimeSelection(this.selectedTimeframe);
      }
      newCollection.timeBegin = t.timeBegin;
      newCollection.timeEnd = t.timeEnd;
    }


    if (!newCollection.bound && this.distillationEnabled ) {
      let endterms = utils.grokLines(this.distillationTerms);
      newCollection.distillationEnabled = false;
      if ( endterms.length !== 0 ) {
        newCollection.distillationEnabled = true;
        newCollection.distillationTerms = endterms;
      }
    }

    if (!newCollection.bound && this.regexDistillationEnabled) {
      let endterms = utils.grokLines(this.regexDistillationTerms);
      newCollection.regexDistillationEnabled = false;
      if ( endterms.length !== 0 ) {
        newCollection.regexDistillationEnabled = true;
        newCollection.regexDistillationTerms = endterms;
      }
    }

    if (!newCollection.bound && this.hashesEnabled && this.sha1Enabled) {
      let endterms = utils.grokHashingLines(this.sha1Hashes);
      newCollection.sha1Enabled = false;
      if ( endterms.length !== 0 ) {
        newCollection.sha1Enabled = true;
        newCollection.sha1Hashes = endterms;
      }
    }

    if (!newCollection.bound && this.hashesEnabled && this.sha256Enabled) {
      let endterms = utils.grokHashingLines(this.sha256Hashes);
      newCollection.sha256Enabled = false;
      if ( endterms.length !== 0 ) {
        newCollection.sha256Enabled = true;
        newCollection.sha256Hashes = endterms;
      }
    }

    if (!newCollection.bound && this.hashesEnabled && this.md5Enabled) {
      let endterms = utils.grokHashingLines(this.md5Hashes);
      newCollection.md5Enabled = false;
      if ( endterms.length !== 0 ) {
        newCollection.md5Enabled = true;
        newCollection.md5Hashes = endterms;
      }
    }

    if ([this.modes.add, this.modes.editFixed, this.modes.adhoc].includes(this.mode)) {
      log.debug('NwCollectionModalComponent: onCollectionSubmit(): new newCollection:', newCollection);
      this.dataService.addCollection(newCollection)
                      .then( () => {
                          this.toolService.executeAddCollection.next( newCollection );
                          this.reOpenTabsModal = false;
                          this.close();
                          this.name = '';
                        });

    }

    if (this.mode === this.modes.editRolling) {
      newCollection.id = this.editingCollectionId;
      newCollection['creator'] = this.editingCreator;
      log.debug('NwCollectionModalComponent: onCollectionSubmit(): edited newCollection:', newCollection);
      this.dataService.editCollection(newCollection)
                      .then( () => {
                          this.toolService.executeEditCollection.next( newCollection );
                          this.reOpenTabsModal = false;
                          this.close();
                          this.name = '';
                        });
    }


  }







  onOpen(): void {
    // log.debug('NwCollectionModalComponent: onOpen()');
  }




  onSelectedTypesChanged(): void {
    log.debug('NwCollectionModalComponent: onSelectedTypesChanged()');
    let v = this.selectedContentTypes;
    let imagesEnabled = false;
    let pdfsEnabled = false;
    let officeEnabled = false;
    let dodgyArchivesEnabled = false;
    let hashesEnabled = false;
    // log.debug('NwCollectionModalComponent: onSelectedTypesChanged: v:', v);
    // log.debug('NwCollectionModalComponent: onSelectedTypesChanged: browserEvent:', event);
    // log.debug('NwCollectionModalComponent: onSelectedTypesChanged: selectedContentTypes:', this.selectedContentTypes);
    for (let i = 0; i < v.length; i++) {
      let value = v[i];
      if (value === 'images') {
        imagesEnabled = true;
      }
      if (value === 'pdfs') {
        pdfsEnabled = true;
      }
      if (value === 'officedocs') {
        officeEnabled = true;
      }
      if (value === 'dodgyarchives') {
        dodgyArchivesEnabled = true;
      }
      if (value === 'hashes') {
        hashesEnabled = true;
      }
    }
    if ( !(officeEnabled || pdfsEnabled) ) {
      this.distillationEnabled = false;
      this.regexDistillationEnabled = false;
    }
    if (!hashesEnabled) {
      this.sha1Enabled = false;
      this.sha256Enabled = false;
      this.md5Enabled = false;
    }
    this.imagesEnabled = imagesEnabled;
    this.pdfsEnabled = pdfsEnabled;
    this.officeEnabled = officeEnabled;
    this.dodgyArchivesEnabled = dodgyArchivesEnabled;
    this.hashesEnabled = hashesEnabled;
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }



  onClearTypesSelected(): void {
    this.selectedContentTypes = [];
    this.onSelectedTypesChanged(); // runs change detection
  }



  onAllTypesSelected() {
    let vals = [];
    for (let i = 0; i < this.contentTypes.length; i++) {
      vals.push( this.contentTypes[i].value );
    }
    this.selectedContentTypes = vals;
    this.onSelectedTypesChanged(); // runs change detection
  }



  onUseCaseChanged(): void {
    log.debug('NwCollectionModalComponent: onUseCaseChanged()');
    // log.debug('NwCollectionModalComponent: onUseCaseChanged: selectedUseCase:', this.selectedUseCase );

    let displayUseCaseDescription = false;
    let thisUseCase: UseCase;

    for (let i = 0; i < this.useCases.length; i++) {
      if (this.useCases[i].name === this.selectedUseCase) {
        thisUseCase = this.useCases[i];
        displayUseCaseDescription = true;
        this.useCaseDescription = this.useCases[i].description;
        break;
      }
    }
    this.displayUseCaseDescription = displayUseCaseDescription;

    if (this.useCaseBinding === 'unbound') {
      this.selectedQuery = 'Custom Query';
    }

    if (this.selectedUseCase === 'custom') {
      this.showUseCaseValues = false;
      this.onSelectedTypesChanged(); // runs change detection
      return;
    }

    // an OOTB use case has been selected
    log.debug('NwCollectionModalComponent: onUseCaseChanged: thisUseCase:', thisUseCase);
    this.queryInputText = thisUseCase.nwquery;
    this.selectedContentTypes = thisUseCase.contentTypes;
    this.onlyContentFromArchives = thisUseCase.onlyContentFromArchives || false;
    this.distillationEnabled = false;
    if ('distillationTerms' in thisUseCase) {
      this.distillationEnabled = true;
      this.distillationTerms = thisUseCase.distillationTerms.join('\n');
    }
    this.regexDistillationEnabled = false;
    if ('regexTerms' in thisUseCase) {
      this.regexDistillationEnabled = true;
      this.regexDistillationTerms = thisUseCase.regexTerms.join('\n');
    }
    // this might be our problem
    if (this.useCaseBinding === 'bound') {
      this.showUseCaseValues = true;
    }
    else {
      // unbound
      this.showUseCaseValues = false;
    }
    this.onSelectedTypesChanged(); // runs change detection
  }



  onUseCaseBoundChanged(): void {
    log.debug('NwCollectionModalComponent: onUseCaseBoundChanged()');

    if (this.type === 'fixed') {
      // Use cases are always unbound for fixed collections, as they only run once
      this.useCaseBinding = 'unbound';
      this.disableBindingControls = true;
    }
    else {
      // not a fixed collection
      this.disableBindingControls = false;
    }

    if (this.selectedUseCase === 'custom') {
      this.showUseCaseValues = false;
    }

    else if (this.useCaseBinding === 'bound') {
      this.showUseCaseValues = true;
      this.onUseCaseChanged(); // this is needed to update the content types, distillation terms, etc
    }
    else {
      // unbound
      this.showUseCaseValues = false;
      this.selectedQuery = 'Custom Query';
    }
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }



  private convertArrayToString(a: any): string {
    let text = '';
    for (let i = 0; i < a.length; i++) {
      text += a[i];
      if (i < a.length - 1) { // omit the newline on the last line
       text += '\n';
      }
    }
    return text;
  }



  private onAddCollectionNext(): void {
    log.debug('NwCollectionModalComponent: onAddCollectionNext()');
    this.hashFeedId = null;
    this.mode = this.modes.add;
    this.okButtonText = 'Execute';
    this.name = '';
    this.nameBoxRef.first.nativeElement.focus();
    this.selectedUseCase = this.useCaseOptions[0].value; // this sets it to 'custom'
    this.showUseCaseValues = false;
    this.displayUseCaseDescription = false;
    if (Object.keys(this.apiServers).length !== 0) {
      let firstApiServerId = Object.keys(this.apiServers)[0];
      this.selectedApiServer = this.apiServers[firstApiServerId];
      log.debug('NwCollectionModalComponent: onAddCollectionNext(): selectedApiServer.id', this.selectedApiServer.id);
    }
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }



  private onAdhocCollectionNext(params: any): void {

    log.debug('NwCollectionModalComponent: onAdhocCollectionNext(): params:', params);

    if (Object.keys(params).length === 0) {
      return;
    }

    this.okButtonText = 'Execute';

    this.adhocParams = params;

    this.hashFeedId = null;
    this.mode = this.modes.adhoc;

    // Collection type
    this.type = 'fixed';

    // Collection name
    const now = dayjs().format('YYYY/MM/DD HH:mm:ssZ');
    if ('host' in params) {
      this.name = 'Adhoc investigation for host \'' + params['host'] + '\' at ' + now;
    }
    else if ('ip' in params) {
      this.name = 'Adhoc investigation for ' + params['side'] + ' IP ' + params['ip'] + ' at ' + now;
    }
    else if ('adUser' in params) {
      this.name = 'Adhoc investigation for ' + params['side'] + ' AD User ' + params['adUser'] + ' at ' + now;
    }

    this.onNameChanged(this.name);
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
    this.nameBoxRef.first.nativeElement.focus();

    // Use case
    this.selectedUseCase = 'custom'; // this sets it to 'custom'
    this.showUseCaseValues = false;
    this.displayUseCaseDescription = false;

    // Query
    this.selectedQuery = this.queryList[0].text; // select all types
    this.onQuerySelected(); // runs change detection


    // Content types
    this.selectedContentTypes = [ 'pdfs', 'officedocs', 'images', 'dodgyarchives' ];
    this.onSelectedTypesChanged(); // runs change detection

    // Timeframe
    this.selectedTimeframe = 'Last 24 Hours';

    // API Server
    if (Object.keys(this.apiServers).length !== 0) {
      let firstApiServerId = Object.keys(this.apiServers)[0];
      this.selectedApiServer = this.apiServers[firstApiServerId];
      log.debug('NwCollectionModalComponent: onAdhocCollectionNext(): selectedApiServer.id', this.selectedApiServer.id);
    }
    this.modalService.open(this.id);
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }



  private onEditCollectionNext(collection: Collection): void {
    // Called when we receive an edit signal from toolbar
    log.debug('NwCollectionModalComponent: onEditCollectionNext(): collection:', collection);
    this.collection = collection;

    if (collection.type === 'fixed') {
      this.okButtonText = 'Execute';
    }
    else if (!this.toolService.selectedCollection || collection.id !== this.toolService.selectedCollection.id ) {
      // update rolling collection that isn't selected
      this.okButtonText = 'Save';
    }
    else {
      // update rolling collection that is selected
      this.okButtonText = 'Update';
    }

    if (collection.type === 'rolling' || collection.type === 'monitoring' ) {
      this.mode = this.modes.editRolling;
      this.editingCollectionId = collection.id;
      if ('creator' in collection) {
        this.editingCreator = collection.creator;
      }
      if (collection.type === 'rolling') {
        this.lastHours = collection.lastHours;
      }
    }
    else {
      this.mode = this.modes.editFixed;
    }

    this.name = collection.name;
    this.origName = collection.name;
    this.onNameChanged(collection.name); // runs change detection
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
    this.type = collection.type;
    this.contentLimit = collection.contentLimit;
    this.onlyContentFromArchives = collection.onlyContentFromArchives || false;
    if ('minX' in collection && 'minY' in collection) {
      this.minX = collection.minX;
      this.minY = collection.minY;
    }
    else {
      this.minX = this.preferences.minX;
      this.minY = this.preferences.minY;
    }
    this.selectedUseCase = collection.usecase;

    if (collection.bound) {
      this.useCaseBinding = 'bound';
      this.onUseCaseBoundChanged();
      this.onUseCaseChanged();
    }
    else {
      // unbound or custom collection
      this.useCaseBinding = 'unbound';
      this.selectedContentTypes = collection.contentTypes;
      this.displayUseCaseDescription = false;
      let foundQuery = false;
      // now try to match the collection query to our predefined queries
      for (let i = 0; i < this.queryList.length; i++) {
        let query = this.queryList[i];
        if (query.queryString === collection.query) {
          this.selectedQuery = query.text;
          foundQuery = true;
        }
      }
      if (!foundQuery) {
        this.selectedQuery = 'Custom Query';
      }
      this.queryInputText = collection.query;
      this.onUseCaseBoundChanged();
      this.onUseCaseChanged();
    }

    if (collection.nwserver in this.apiServers) {
      log.debug(`NwCollectionModalComponent: onEditCollectionNext(): Collection's nwserver ${collection.nwserver} is defined`);
      let firstApiServerId = collection.nwserver;
      this.selectedApiServer = this.apiServers[firstApiServerId];
    }
    else {
      log.debug(`NwCollectionModalComponent: onEditCollectionNext(): Collection's nwserver ${collection.nwserver} is not currently defined.  It must've been deleted.`);
      this.selectedApiServer = null;
    }

    if (collection.distillationEnabled) {
      this.distillationEnabled = true;
      this.distillationTerms = this.convertArrayToString(collection.distillationTerms);
    }
    else {
      this.distillationEnabled = false;
    }

    if (collection.regexDistillationEnabled) {
      this.regexDistillationEnabled = true;
      this.regexDistillationTerms = this.convertArrayToString(collection.regexDistillationTerms);
    }
    else {
      this.regexDistillationEnabled = false;
    }

    if (collection.useHashFeed) {
      this.hashingMode = this.hashingModes.feed;
      this.hashFeedId = collection.hashFeed;
      // now get the feed object and stick it in selectedFeed
    }
    else {
      this.hashingMode = this.hashingModes.manual;
      if (collection.sha1Enabled) {
        this.sha1Enabled = true;
        this.sha1Hashes = utils.getHashesFromConfig(collection.sha1Hashes);
      }
      else {
        this.sha1Enabled = false;
      }

      if (collection.sha256Enabled) {
        this.sha256Enabled = true;
        this.sha256Hashes = utils.getHashesFromConfig(collection.sha256Hashes);
      }
      else {
        this.sha256Enabled = false;
      }

      if (collection.md5Enabled) {
        this.md5Enabled = true;
        this.md5Hashes = utils.getHashesFromConfig(collection.md5Hashes);
      }
      else {
        this.md5Enabled = false;
      }
    }
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }



  /////////// API Servers ///////////



  private onApiServersChanged(apiServers: NwServers) {
    if (Object.keys(apiServers).length === 0) {
      return;
    }
    log.debug('NwCollectionModalComponent: onApiServersChanged(): apiServers:', apiServers);
    this.apiServers = apiServers;

    let options: SelectItem[] = [];
    Object.keys(this.apiServers).forEach( server => {
      // log.debug('nwserver:', server);
      options.push( { label: this.apiServers[server].friendlyName, value: this.apiServers[server] } )  ;
    });

    this.apiServersOptions = options;

    this.pickAnApiServer();
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }



  private pickAnApiServer() {
    log.debug('NwCollectionModalComponent: pickAnApiServer()');
    if (Object.keys(this.apiServers).length === 0) {
      // no API servers are defined
      this.selectedApiServer = null;
    }
    else if (this.setThisApiServerIdOnNextPick) {
      // we predetermined which server we're going to choose.  Only used if onNewApiServer() has run
      this.selectedApiServer = this.apiServers[this.setThisApiServerIdOnNextPick];
      this.setThisApiServerIdOnNextPick = null;
    }
    else if (Object.keys(this.apiServers).length === 1) {
      // only one api server is defined - select it
      let firstApiServerId = Object.keys(this.apiServers)[0];
      this.selectedApiServer = this.apiServers[firstApiServerId];
    }
    else if (this.selectedApiServer && !Object.keys(this.apiServers).includes(this.selectedApiServer.id)) {
      // we got new api servers and our selected server isn't one of them (deletion).
      // let's make no assumptions and force the user to select one
      this.selectedApiServer = null;
    }
    else {
      // we got new api servers and our selected server is one of them - do nothing
    }
    // log.debug('NwCollectionModalComponent: pickAnApiServer(): selectedApiServerId:', selectedApiServerId);

  }



  onNewApiServer(newServer: NwServer) {
    log.debug('NwCollectionModalComponent: onNewApiServer(): newServer:', newServer);
    // select the new server
    this.setThisApiServerIdOnNextPick = newServer.id;
  }



  onDeleteApiServerClicked(): void {
    log.debug('NwCollectionModalComponent: onDeleteApiServerClicked(): selectedApiServer.id', this.selectedApiServer.id);
    this.modalService.open(this.toolService.confirmNwServerDeleteModalId);
  }



  apiServerSelectionValid(): boolean {
    // log.debug('NwCollectionModalComponent: apiServerFormValid()');
    // log.debug('this.selectedApiServer.id:', this.selectedApiServer.id);
    // log.debug('this.apiServers:', this.apiServers);
    if (Object.keys(this.apiServers).length === 0) {
      return false;
    }
    else if (!this.selectedApiServer) {
      return false;
    }
    if (!(this.selectedApiServer.id in this.apiServers)) {
      return false;
    }
    if (this.addCollectionForm.form.valid && this.selectedApiServer) {
      return true;
    }
    return false;
  }



  onTestApiServerClicked(): void {
    if (this.testInProgress) {
      return;
    }
    this.testError = 'Test in progress';
    this.thumbClass = '';

    this.testInProgress = true;

    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();

    let server = this.selectedApiServer;

    this.dataService.testNwServer(server)
                    .then( () => {
                      this.testInProgress = false;
                      let msg = 'Connection was successful';
                      this.thumbClass = 'fa-thumbs-up';
                      this.testError = msg;

                    })
                    .catch( (err) => {
                      this.testInProgress = false;
                      let msg = 'Connection failed';
                      this.thumbClass = 'fa-thumbs-down';
                      this.testError = msg;
                      log.info('Test connection failed with error:', err);
                    })
                    .then( () => {
                      this.changeDetectionRef.markForCheck();
                      this.changeDetectionRef.detectChanges();
                    });
  }



  onEditApiServerClicked(): void {
    log.debug('NwCollectionModalComponent: onEditApiServerClicked()');
    this.addingService = false; // set mode to editing
    this.changeDetectionRef.detectChanges();
    this.modalService.open(this.toolService.newEditNwServiceModalId);
  }



  onApiServerClicked(event) {
    log.debug('NwCollectionModalComponent: onApiServerClicked(): selectedApiServer.id:', this.selectedApiServer.id);
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }



  onSetDefaultApiServerClicked() {
    if (!this.selectedApiServer) {
      return;
    }
    this.toolService.setPreference('defaultNwService', this.selectedApiServer.id);
  }



  onTabClicked() {
    this.changeDetectionRef.markForCheck();
    this.changeDetectionRef.detectChanges();
  }

}
