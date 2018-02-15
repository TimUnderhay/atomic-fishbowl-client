import { Injectable } from '@angular/core';
import { Subject } from 'rxjs/Subject';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { toPromise } from 'rxjs/operator/toPromise';
import { HttpHeaders, HttpClient } from '@angular/common/http';
import { Collection } from './collection';
import { NwServer } from './nwserver';
import { SaServer } from './saserver';
import { HttpJsonStream } from './http-json-stream';
import { AuthenticationService } from './authentication.service';
import { ToolService } from './tool.service';
import { UseCase } from './usecase';
import { Feed } from './feed';
import { Preferences } from './preferences';
import * as log from 'loglevel';
import * as io from 'socket.io-client';

@Injectable()

export class DataService { // Manages NwSession objects and also Image objects in grid and the image's association with Session objects.  Adds more objects as they're added

  constructor(private http: HttpClient, private toolService: ToolService ) {

    this.toolService.sessionId.subscribe( (sessionId: number) => {
      log.debug(`DataService: sessionIdSubscription(): got sessionId: ${sessionId}`);
      this.sessionId = sessionId;
    });

    this.toolService.HttpJsonStreamConnected.subscribe( (connected: boolean) => this.httpJsonStreamServiceConnected = connected );

    // Subscribe to socket events
    this.socket.on('preferences', preferences => this.onPreferencesUpdate(preferences) );
    this.socket.on('collections', collections => this.onCollectionsUpdate(collections) );
    this.socket.on('serverVersion', version => this.onServerVersionUpdate(version) );
    this.socket.on('publicKey', key => this.onPublicKeyUpdate(key) );
    this.socket.on('nwservers', apiServers => this.onNwServersUpdate(apiServers) );
    this.socket.on('saservers', apiServers => this.onSaServersUpdate(apiServers) );
    this.socket.on('feeds', feeds => this.onFeedsUpdate(feeds) );
    this.socket.on('feedStatus', feedStatus => this.onFeedStatusUpdate(feedStatus) );
    this.socket.on('users', users => this.onUsersUpdate(users) );
    this.socket.on('useCases', useCases => this.onUseCasesUpdate(useCases) );
    this.socket.on('logout', () => this.toolService.logout.next() ); // TODO: triggered by the socket when our validity expires

    // Subscribe to rolling collection socket events
    this.rollingSocket.on('state', (state) => this.collectionStateChanged.next(state) );
    this.rollingSocket.on('purge', (collectionPurge) => this.sessionsPurged.next(collectionPurge) );
    this.rollingSocket.on('deleted', (user) => this.collectionDeleted.next(user) );
    // this.rollingSocket.on('disconnect', () => {} ); // not sure what to do yet
    this.rollingSocket.on('clear', () => {
      this.contentReplaced.next( [] );
      this.sessionsReplaced.next( {} );
    } );
    this.rollingSocket.on('update', (update) => {
      if ('session' in update) {
        this.sessionPublished.next(update.session);
      }
      if ('images' in update) {
        this.contentPublished.next(update.images);
      }
      if ('search' in update) {
        this.searchPublished.next(update.search);
      }
    });
  }



  private socket = io();
  private rollingSocket = io('/rolling');
  private httpJsonStreamService: HttpJsonStream = new HttpJsonStream(this.toolService);

  // Observables
  public contentPublished: Subject<any> = new Subject<any>();
  public sessionPublished: Subject<any> = new Subject<any>();
  public selectedCollectionChanged: Subject<any> = new Subject<any>();
  public collectionStateChanged: Subject<any> = new Subject<any>();
  public sessionsReplaced: Subject<any> = new Subject<any>();
  public contentReplaced: Subject<any> = new Subject<any>();
  public searchReplaced: Subject<any> = new Subject<any>();
  public searchPublished: Subject<any> = new Subject<any>();
  public errorPublished: Subject<any> = new Subject<any>();
  public sessionsPurged: Subject<any> = new Subject<any>();
  public queryResultsCountUpdated: Subject<any> = new Subject<any>();
  public collectionDeleted: Subject<string> = new Subject<string>();

  public collectionsChanged: BehaviorSubject<any> = new BehaviorSubject<any>({});
  public preferencesChanged: BehaviorSubject<any> = new BehaviorSubject<any>({});
  public nwServersChanged: BehaviorSubject<any> = new BehaviorSubject<any>({});
  public saServersChanged: BehaviorSubject<any> = new BehaviorSubject<any>({});
  public feedsChanged: BehaviorSubject<any> = new BehaviorSubject<any>({});
  public feedStatusChanged: BehaviorSubject<any> = new BehaviorSubject<any>({});
  public usersChanged: BehaviorSubject<any> = new BehaviorSubject<any>({});
  public serverVersionChanged: BehaviorSubject<string> = new BehaviorSubject<string>(null);
  public publicKeyChanged: BehaviorSubject<string> = new BehaviorSubject<string>(null);
  public useCasesChanged: BehaviorSubject<object> = new BehaviorSubject<object>( { useCases: [], useCasesObj: {} } );


  // Properties
  private apiUrl = '/api';
  private sessionId: number;
  public httpJsonStreamServiceConnected = false;

  public init(): Promise<any> {
    // Run by authentication service at login or page load
    log.debug('DataService: init()');
    return Promise.resolve();
  }


  /////////////////////SOCKET.IO EVENTS//////////////////

  // We could pipe the events straight to the observables but...
  // we keep this here for debugging purposes and any custom logic required

  onPreferencesUpdate(preferences: Preferences) {
    log.debug('DataService: onPreferencesUpdate(): preferences:', preferences);
    this.preferencesChanged.next(preferences);
  }



  onCollectionsUpdate(collections: any) {
    log.debug('DataService: onCollectionsUpdate(): collections:', collections);
    this.collectionsChanged.next(collections);
  }



  onServerVersionUpdate(version: string) {
    log.debug('DataService: onServerVersionUpdate(): version:', version);
    this.serverVersionChanged.next(version);
  }



  onPublicKeyUpdate(key: string) {
    log.debug('DataService: onPublicKeyUpdate(): key:', key);
    this.publicKeyChanged.next(key);
  }



  onNwServersUpdate(apiServers) {
    log.debug('DataService: onNwServersUpdate(): key:', apiServers);
    this.nwServersChanged.next(apiServers);
  }



  onSaServersUpdate(apiServers) {
    log.debug('DataService: onSaServersUpdate(): key:', apiServers);
    this.saServersChanged.next(apiServers);
  }



  onFeedsUpdate(feeds) {
    log.debug('DataService: onFeedsUpdate(): feeds:', feeds);
    this.feedsChanged.next(feeds);
  }



  onFeedStatusUpdate(feedStatus) {
    log.debug('DataService: onFeedStatusUpdate(): feedStatus:', feedStatus);
    this.feedStatusChanged.next(feedStatus);
  }



  onUsersUpdate(users) {
    log.debug('DataService: onUsersUpdate(): users:', users);
    this.usersChanged.next(users);
  }



  onUseCasesUpdate(useCases) {
    log.debug('DataService: onUseCasesUpdate(): useCases:', useCases );
    let useCasesObj = {};
    for (let i = 0; i < useCases.length; i++) {
      let thisUseCase = useCases[i];
      useCasesObj[thisUseCase.name] = thisUseCase;
    }
    this.useCasesChanged.next( { useCases: useCases, useCasesObj: useCasesObj } );
  }


  /////////////////////SERVER VERSION/////////////////////

  /*getServerVersion(): Promise<any> {
    return this.http
                .get(this.apiUrl + '/version' )
                .toPromise()
                .then( (response: any) => {
                                    return response.version;
                                  })
                .catch(e => this.handleError(e));
  }*/



  /////////////////////PUBLIC KEY/////////////////////

  /*getPublicKey(): Promise<any> {
    return this.http
                .get(this.apiUrl + '/publickey' )
                .toPromise()
                .then( (response: any) => response.pubKey as string )
                .catch(e => this.handleError(e));
  }*/



  /////////////////////NW SERVERS/////////////////////

  /*getNwServers(): Promise<any> {
    log.debug('DataService: getNwServers()');
    return this.http
                .get(this.apiUrl + '/nwserver' )
                .toPromise()
                .then( (response: any) => response as any )
                .catch(e => this.handleError(e));
  }*/


  testNwServer( server: any ): Promise<any> {
    return this.http
                .post(this.apiUrl + '/nwserver/test', server )
                .toPromise();
  }


  deleteNwServer(id: string): Promise<void> {
    log.debug('DataService: deleteNwServer():', id);
    return this.http.delete(this.apiUrl + '/nwserver/' + id )
                .toPromise()
                .then(response => response as any)
                .catch(e => this.handleError(e));
  }


  addNwServer(nwserver: NwServer): Promise<any> {
    log.debug('DataService: addNwServer()');
    let headers = new HttpHeaders().set('Content-Type', 'application/json');
    return this.http.post(this.apiUrl + '/nwserver', nwserver, { headers } )
                .toPromise()
                .then(response => {
                  log.debug('DataService: addNwServer(): response:', response);
                });
  }


  editNwServer(nwserver: NwServer): Promise<any> {
    log.debug('DataService: editNwServer()');
    let headers = new HttpHeaders().set('Content-Type', 'application/json');
    return this.http.post(this.apiUrl + '/nwserver/edit', nwserver, { headers } )
                .toPromise()
                .then(response => {
                  log.debug('DataService: editNwServer(): response:', response);
                });
  }



    /////////////////////NW SERVERS/////////////////////

    /*getSaServers(): Promise<any> {
      log.debug('DataService: getSaServers()');
      return this.http
                  .get(this.apiUrl + '/saserver' )
                  .toPromise()
                  .then( (response: any) => response as any )
                  .catch(e => this.handleError(e));
    }*/


    testSaServer( server: any ): Promise<any> {
      return this.http
                  .post(this.apiUrl + '/saserver/test', server )
                  .toPromise();
    }


    deleteSaServer(id: string): Promise<void> {
      log.debug('DataService: deleteSaServer():', id);
      return this.http.delete(this.apiUrl + '/saserver/' + id )
                  .toPromise()
                  .then(response => response as any)
                  .catch(e => this.handleError(e));
    }


    addSaServer(saserver: SaServer): Promise<any> {
      log.debug('DataService: addSaServer()');
      let headers = new HttpHeaders().set('Content-Type', 'application/json');
      return this.http.post(this.apiUrl + '/saserver', saserver, { headers } )
                  .toPromise()
                  .then(response => {
                    log.debug('DataService: addSaServer(): response:', response);
                  });
    }


    editSaServer(saserver: SaServer): Promise<any> {
      log.debug('DataService: editSaServer()');
      let headers = new HttpHeaders().set('Content-Type', 'application/json');
      return this.http.post(this.apiUrl + '/saserver/edit', saserver, { headers } )
                  .toPromise()
                  .then(response => {
                    log.debug('DataService: editSaServer(): response:', response);
                  });
    }

  /////////////////////USE CASES/////////////////////

  /*getUseCases(): void {
    log.debug('DataService: getUseCases()');
    this.http
        .get(this.apiUrl + '/usecases')
        .toPromise()
        .then( (response: any) => {
          log.debug('DataService: getUseCases: got response:', response );
          let useCases = response.useCases;
          let useCasesObj = {};
          for (let i = 0; i < useCases.length; i++) {
            let thisUseCase = useCases[i];
            useCasesObj[thisUseCase.name] = thisUseCase;
          }
          this.useCasesChanged.next( { useCases: useCases, useCasesObj: useCasesObj } );
        })
        .catch(e => this.handleError(e));
  }*/

  /////////////////////PREFERENCES/////////////////////

  /*getPreferences(): Promise<any> {
    return this.http
                .get(this.apiUrl + '/preferences' )
                .toPromise()
                .then( (response: any) => {
                    let prefs = response;
                    this.preferencesChanged.next(prefs);
                    return prefs;
                  })
                .catch(e => this.handleError(e));
  }*/


  setPreferences(prefs: any): Promise<void> {
    let headers = new HttpHeaders().set('Content-Type', 'application/json');
    this.preferencesChanged.next(prefs);
    return this.http.post(this.apiUrl + '/preferences', prefs, { headers } )
                    .toPromise()
                    .then(response => {} )
                    .catch(e => this.handleError(e));
  }


  /////////////////////COLLECTIONS/////////////////////

  /*getCollections(): Promise<Collection[]> {
    log.debug('DataService: getCollections()');
    return this.http.get(this.apiUrl + '/collection' )
                .toPromise()
                .then( (response: any) => response as Collection[] )
                .catch(e => this.handleError(e));
  }*/


  /*refreshCollections(): Promise<void> {
    log.debug('DataService: refreshCollections()');
    return this.http.get(this.apiUrl + '/collection' )
                .toPromise()
                .then( (response: any) => this.collectionsChanged.next(response) )
                .catch(e => this.handleError(e));
  }*/


  addCollection(collection: any):  Promise<any> {
    log.debug('DataService: addCollection():', collection.id);
    let headers = new HttpHeaders().set('Content-Type', 'application/json');
    return this.http.post(this.apiUrl + '/collection', collection, { headers } )
                .toPromise()
                .then(response => {
                  log.debug(response);
                })
                .catch(e => this.handleError(e));
  }


  editCollection(collection: any):  Promise<any> {
    log.debug('DataService: editCollection():', collection.id);
    let headers = new HttpHeaders().set('Content-Type', 'application/json');
    return this.http.post(this.apiUrl + '/collection/edit', collection, { headers } )
                .toPromise()
                .then(response => {
                  log.debug(response);
                })
                .catch(e => this.handleError(e));
  }



  getRollingCollection(id: string): void {
    log.debug('DataService: getRollingCollection():', id);
    this.httpJsonStreamService.fetchStream(this.apiUrl + '/collection/rolling/' + id, { afbsessionid: this.sessionId } )
                              .subscribe( (o: any) => {
                                                        if ('collection' in o) {
                                                          // log.debug("received collection update",o.collection);
                                                          this.collectionStateChanged.next(o.collection);
                                                        }
                                                        else if ('wholeCollection' in o) {
                                                          // this.selectedCollectionChanged.next(collection);
                                                          this.contentReplaced.next( o['wholeCollection']['images'] );
                                                          this.sessionsReplaced.next( o['wholeCollection']['sessions'] );
                                                          if ('search' in o['wholeCollection']) {
                                                            this.searchReplaced.next( o['wholeCollection']['search'] );
                                                          }
                                                        }
                                                        else if ('collectionDeleted' in o) {
                                                          let user = o['user'];
                                                          this.collectionDeleted.next(user);
                                                        }
                                                        else if ('heartbeat' in o) { log.debug('heartbeat'); }
                                                        else if ('error' in o) {
                                                          this.errorPublished.next(o.error);
                                                        }
                                                        else if ('queryResultsCount' in o) {
                                                          this.queryResultsCountUpdated.next(o.queryResultsCount);
                                                        }
                                                        else if ('collectionUpdate' in o) {
                                                          if ('session' in o.collectionUpdate) {
                                                            this.sessionPublished.next(o.collectionUpdate.session);
                                                          }
                                                          if ('images' in o.collectionUpdate) {
                                                            this.contentPublished.next(o.collectionUpdate.images);
                                                          }
                                                          if ('search' in o.collectionUpdate) {
                                                            this.searchPublished.next(o.collectionUpdate.search);
                                                          }
                                                        }
                                                        else if ('close' in o) { return; }
                                                        else if ('collectionPurge' in o) {
                                                          this.sessionsPurged.next(o.collectionPurge);
                                                        }
                                                        else if ('collectionEdited' in o) { } // do something to reload the collection
                                                        else {
                                                          // there's data here that shouldn't be
                                                          log.error('DataService: getRollingCollection(): unhandled JSON data', o);
                                                        }
                              });
  }



  getFixedCollection(id: string, collection: Collection): void {
    log.debug('DataService: getFixedCollection():', id);
    this.selectedCollectionChanged.next(collection);
    this.httpJsonStreamService.fetchStream(this.apiUrl + '/collection/fixed/' + id)
                              .subscribe( (o: any) => {
                                                        // log.debug('DataService: getFixedCollection(): o:', o);
                                                        let good = false;
                                                        if ('collection' in o) {
                                                          // log.debug("received collection update",o.collection);
                                                          this.collectionStateChanged.next(o.collection);
                                                          good = true;
                                                        }
                                                        if ('wholeCollection' in o) {
                                                          // this.selectedCollectionChanged.next(collection);
                                                          this.contentReplaced.next( o['wholeCollection']['images'] );
                                                          this.sessionsReplaced.next( o['wholeCollection']['sessions'] );
                                                          if ('search' in o['wholeCollection']) {
                                                            this.searchReplaced.next( o['wholeCollection']['search'] );
                                                          }
                                                          good = true;
                                                        }
                                                        if ('collectionDeleted' in o) {
                                                          let user = o['user'];
                                                          this.collectionDeleted.next(user);
                                                          good = true;
                                                        }
                                                        if ('heartbeat' in o) {
                                                          good = true;
                                                        }
                                                        if ('error' in o) {
                                                          this.errorPublished.next(o.error);
                                                          good = true;
                                                        }
                                                        if ('queryResultsCount' in o) {
                                                          this.queryResultsCountUpdated.next(o.queryResultsCount);
                                                          good = true;
                                                        }
                                                        if ('collectionUpdate' in o) {
                                                          good = true;
                                                          if ('session' in o.collectionUpdate) {
                                                            this.sessionPublished.next(o.collectionUpdate.session);
                                                          }
                                                          if ('images' in o.collectionUpdate) {
                                                            this.contentPublished.next(o.collectionUpdate.images);
                                                          }
                                                          if ('search' in o.collectionUpdate) {
                                                            this.searchPublished.next(o.collectionUpdate.search);
                                                          }
                                                        }
                                                        if ('close' in o) { return; }
                                                        if (!good) {
                                                          // there's data here that shouldn't be
                                                          log.error('DataService: getFixedCollection(): unhandled JSON data', o);
                                                        }
                              });
  }


  abortGetBuildingCollection(): Promise<void> {
    log.debug('DataService: abortGetBuildingCollection()');
    return new Promise<void>( resolve => {
      this.httpJsonStreamService.abort();
      resolve();
    });
  }


  pauseMonitoringCollection(id: string): Promise<void> {
    log.debug('DataService: pauseMonitoringCollection()');
    let headers = new HttpHeaders().set('afbsessionid', this.sessionId.toString() );
    return this.http.get(this.apiUrl + '/collection/monitoring/pause/' + id, { headers } )
                    .toPromise()
                    // .then( response => {} )
                    .catch(e => this.handleError(e));
  }


  unpauseMonitoringCollection(id: string): Promise<void> {
    log.debug('DataService: unpauseMonitoringCollection()');
    let headers = new HttpHeaders().set('afbsessionid', this.sessionId.toString() );
    return this.http.get(this.apiUrl + '/collection/monitoring/unpause/' + id, { headers } )
                    .toPromise()
                    // .then( response => {} )
                    .catch(e => this.handleError(e));
  }


  getCollectionData(collection: any): Promise<string> {
    let id = collection.id;
    log.debug('DataService: getCollectionData(' + id + '):', collection);
    return this.http.get(this.apiUrl + '/collection/data/' + id )
                    .toPromise()
                    .then( (response: any) => {
                      let data = response;
                      this.selectedCollectionChanged.next(collection);
                      this.contentReplaced.next(data.images);
                      this.sessionsReplaced.next(data.sessions);
                      if (data.search) {
                        this.searchReplaced.next(data.search);
                      }
                    })
                    .catch(e => this.handleError(e));
  }



  deleteCollection(id: string): Promise<void> {
    log.debug('DataService: deleteCollection():', id);
    return this.http.delete(this.apiUrl + '/collection/' + id )
                .toPromise()
                .then( () => {} )
                .catch(e => this.handleError(e));
  }


  /////////////////////FEEDS/////////////////////

  /*getFeeds(): Promise<any> {
    log.debug('DataService: getFeeds()');
    return this.http.get(this.apiUrl + '/feed' )
                .toPromise()
                .then( (response: any) => {
                  this.feedsChanged.next(response); // emit an observable event
                  return response; // also send the object in the promise
                })
                .catch(e => this.handleError(e));
  }*/



  deleteFeed(id: string): Promise<any> {
    log.debug('DataService: deleteFeed():', id);
    return this.http.delete(this.apiUrl + '/feed/' + id )
               .toPromise();
  }



  addFeedManual(feed: Feed, file: File): Promise<any> {
    log.debug('DataService: addFeedManual()');
    let formData = new FormData();
    formData.append('model', JSON.stringify(feed));
    formData.append('file', file);
    return this.http.post(this.apiUrl + '/feed/manual', formData )
                .toPromise()
                .then(response => {
                  log.debug('DataService: addFeedManual(): response:', response);
                  return response;
                });
  }



  editFeedWithoutFile(feed: Feed): Promise<any> {
    log.debug('DataService: editFeedWithoutFile()');
    let headers = new HttpHeaders().set('Content-Type', 'application/json');
    return this.http.post(this.apiUrl + '/feed/edit/withoutfile', feed, { headers } )
                .toPromise()
                .then(response => {
                  log.debug('DataService: editFeedWithoutFile(): response:', response);
                  return response;
                });
  }



  editFeedWithFile(feed: Feed, file: File): Promise<any> {
    log.debug('DataService: editFeedWithFile()');
    let formData = new FormData();
    formData.append('model', JSON.stringify(feed));
    formData.append('file', file);
    return this.http.post(this.apiUrl + '/feed/edit/withfile', formData )
                .toPromise()
                .then(response => {
                  log.debug('DataService: editFeedWithFile(): response:', response);
                  return response;
                });
  }



  addFeedScheduled(feed: Feed): Promise<any> {
    log.debug('DataService: addFeedScheduled()');
    let headers = new HttpHeaders().set('Content-Type', 'application/json');
    return this.http.post(this.apiUrl + '/feed/scheduled', feed, { headers } )
                .toPromise()
                .then(response => {
                  log.debug('DataService: addFeedScheduled(): response:', response);
                  return response;
                });
  }



  testFeedUrl( host: any ): Promise<any> {
    return this.http
                .post(this.apiUrl + '/feed/testurl', host )
                .toPromise();
  }



  getFeedFilehead(id: string): Promise<any> {
    return this.http.get(this.apiUrl + '/feed/filehead/' + id )
               .toPromise();
  }



  /*getFeedStatus(): Promise<any> {
    return this.http.get(this.apiUrl + '/feed/status' )
               .toPromise();
  }*/





  /////////////////////USERS/////////////////////

  /*getUsers(): Promise<any> {
    return this.http
                .get(this.apiUrl + '/user' )
                .toPromise()
                .then( (response: any) => response as any )
                .catch(e => this.handleError(e));
  }*/



  deleteUser(id: string): Promise<void> {
    log.debug('DataService: deleteUser():', id);
    return this.http.delete(this.apiUrl + '/user/' + id )
                .toPromise()
                .then(response => response as any)
                .catch(e => this.handleError(e));
  }



  addUser(user: any): Promise<any> {
    log.debug('DataService: addUser()');
    let headers = new HttpHeaders().set('Content-Type', 'application/json');
    return this.http.post(this.apiUrl + '/user', user, { headers } )
                .toPromise()
                .then(response => {
                  log.debug(response);
                })
                .catch(e => this.handleError(e));
  }



  updateUser(user: any): Promise<any> {
    log.debug('DataService: updateUser()');
    let headers = new HttpHeaders().set('Content-Type', 'application/json');
    return this.http.post(this.apiUrl + '/user/edit', user, { headers } )
                .toPromise()
                .then(response => {
                  log.debug(response);
                })
                .catch(e => this.handleError(e));
  }




  /////////////////////PING/////////////////////

  ping(): Promise<any> {
    // log.debug('DataService: ping()');
    return this.http.get(this.apiUrl + '/ping')
                    .toPromise();
  }



  handleError(error: any): Promise<any> {
    if (error.status === 401) {
      this.toolService.logout.next();
      return Promise.reject(error.message || error);
    }
    else {
      log.error('ERROR: ', error);
      return Promise.reject(error.message || error);
    }
  }

}
