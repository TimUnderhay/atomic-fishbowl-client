import { Injectable } from '@angular/core';
import { Subject, BehaviorSubject } from 'rxjs';
import { Collection } from 'types/collection';
import { Feed } from 'types/feed';
import { Logger } from 'loglevel';
declare var log: Logger;

@Injectable()

export class ToolService {

  // properties
  public splashLoaded = false;
  public firstLoad = true;
  public loadCollectionOnRouteChange = false; // this may be set before switching routes to instruct the new view to load a particular collcetion
  public queryParams: any = null;
  public urlParametersLoaded = false;
  public lastRoute: string = null;
  public accordionCollapsedHeight = 0;

  ////////////  SUBSCRIPTIONS ////////////

  // Device Number
  public deviceNumber: BehaviorSubject<any> = new BehaviorSubject<any>(0);

  // Scrolling
  public scrollToBottom: Subject<any> = new Subject<any>();
  public stopScrollToBottom: Subject<any> = new Subject<any>(); // commands the view to stop scrolling
  public scrollToBottomRunning: Subject<any> = new Subject<any>(); // this notifies that scrolling has been started by the view
  public scrollToBottomStopped: Subject<any> = new Subject<any>(); // this notifies that scrolling has finished in the view

  // Masonry
  public showMasonryTextArea: Subject<boolean> = new Subject<boolean>();
  public showMasonryTextAreaState = true;
  public refreshMasonryLayout: Subject<void> = new Subject<void>();
  public masonryColumnWidthChanged: Subject<number> = new Subject<number>();
  public masonryAutoscrollSpeedChanged: Subject<number> = new Subject<number>();

  // Users
  public confirmUserDelete: Subject<any> = new Subject<any>();
  public userToDelete: Subject<any> = new Subject<any>();

  // Authentication
  public logout: Subject<any> = new Subject<any>();

  // Misc
  public newSession: Subject<any> = new Subject<any>();
  public newImage: Subject<any> = new Subject<any>();
  public fileToDownload: Subject<any> = new Subject<any>();
  public confirmDownloadFile: Subject<any> = new Subject<any>();
  public clientSessionId: Subject<any> = new Subject<any>();
  public onSplashScreenAtStartupClosed: Subject<void> = new Subject<void>();
  public eulaAccepted: Subject<void> = new Subject<void>();

  // Open viewers
  public openPDFViewer: Subject<any> = new Subject<any>();
  public openSessionViewer: Subject<any> = new Subject<any>();
  public nextSessionClicked: Subject<any> = new Subject<any>(); // tells the view component to send the next session to the pdf / session details modal
  public previousSessionClicked: Subject<any> = new Subject<any>(); // tells the view component to send the previous session to the
  public noNextSession: Subject<boolean> = new Subject<boolean>(); // tells the  pdf / session details modal that there is no next session to view, so disable its next session button
  public noPreviousSession: Subject<boolean> = new Subject<boolean>(); // tells the  pdf / session details modal that there is no previous session to view, so disable its prebious session button

  // NW and SA Servers
  public nwServerToDelete: Subject<any> = new Subject<any>();
  public saServerToDelete: Subject<any> = new Subject<any>();
  public confirmNwServerDelete: Subject<string> = new Subject<string>();
  public confirmSaServerDelete: Subject<string> = new Subject<string>();


  // collections //
  public getCollectionDataAgain: Subject<any> = new Subject<any>();
  public selectedCollection: Collection;
  public deleteCollectionNext: Subject<Collection> = new Subject<Collection>();
  public deleteCollectionConfirmed: Subject<string> = new Subject<string>();
  public executeCollectionOnEdit: Subject<boolean> = new Subject<boolean>();
  public executeAddCollection: Subject<any> = new Subject<any>();
  public executeEditCollection: Subject<any> = new Subject<any>();

  // communicates to collection dialogs that when they open, they should be in 'adhoc' mode
  public addNwAdhocCollectionNext: BehaviorSubject<any> = new BehaviorSubject<any>({});
  public addSaAdhocCollectionNext: BehaviorSubject<any> = new BehaviorSubject<any>({});

  // communicates to collection dialogs that when they open, they should be in 'add' mode
  public addNwCollectionNext: Subject<void> = new Subject<void>();
  public addSaCollectionNext: Subject<void> = new Subject<void>();

  // communicates to collection dialogs that when they open, they should be in 'edit' mode
  public editNwCollectionNext: Subject<Collection> = new Subject<Collection>();
  public editSaCollectionNext: Subject<Collection> = new Subject<Collection>();



  // feeds
  public addFeedNext: Subject<void> = new Subject<void>();
  public editFeedNext: Subject<Feed> = new Subject<Feed>();
  public deleteFeedNext: Subject<Feed> = new Subject<Feed>();



  // Tab Container
  public collectionsOpened: Subject<void> = new Subject<void>();
  public feedsOpened: Subject<void> = new Subject<void>();
  public tabContainerClosed: Subject<void> = new Subject<void>();
  public reOpenTabsModal: Subject<boolean> = new Subject<boolean>();



  constructor() {
    log.debug('ToolService: constructor()');
    this.showMasonryTextAreaState = this.getPreference('showMeta') == null ? true : this.getPreference('showMeta'); // sets to true if null

    this.showMasonryTextArea.subscribe( (show) => {
      this.showMasonryTextAreaState = show;
      this.setPreference('showMeta', show);
    });

    this.lastRoute = this.getPreference('lastRoute');
  }



  stop() {
    log.debug('ToolService: stop()');
    this.selectedCollection = null;
    this.deviceNumber.next(0);
    this.addNwAdhocCollectionNext.next({});
    this.addSaAdhocCollectionNext.next({});
  }



  setPreference(key, value): void {
    localStorage.setItem(key, value);
  }



  getPreference(key): any {
    let item: any = localStorage.getItem(key);

    if (item == null) {
      return null;
    }

    let numberRegex = /^[\d\.]+$/;

    if ( numberRegex.test(item) ) {
      item = Number(item);
    }

    if (item === 'true') {
      item = true;
    }
    if (item === 'false') {
      item = false;
    }

    return item;
  }

}