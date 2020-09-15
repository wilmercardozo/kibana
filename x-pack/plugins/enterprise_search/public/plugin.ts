/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  AppMountParameters,
  CoreSetup,
  CoreStart,
  HttpSetup,
  Plugin,
  PluginInitializerContext,
} from 'src/core/public';
import { DEFAULT_APP_CATEGORIES } from '../../../../src/core/public';
import {
  FeatureCatalogueCategory,
  HomePublicPluginSetup,
} from '../../../../src/plugins/home/public';
import { LicensingPluginSetup } from '../../licensing/public';
import {
  APP_SEARCH_PLUGIN,
  ENTERPRISE_SEARCH_PLUGIN,
  WORKPLACE_SEARCH_PLUGIN,
} from '../common/constants';
import { IInitialAppData } from '../common/types';
import { ExternalUrl, IExternalUrl } from './applications/shared/enterprise_search_url';

export interface ClientConfigType {
  host?: string;
}
export interface ClientData extends IInitialAppData {
  externalUrl: IExternalUrl;
  errorConnecting?: boolean;
}

export interface PluginsSetup {
  home?: HomePublicPluginSetup;
  licensing: LicensingPluginSetup;
}

export class EnterpriseSearchPlugin implements Plugin {
  private config: ClientConfigType;
  private hasInitialized: boolean = false;
  private data: ClientData = {} as ClientData;

  constructor(initializerContext: PluginInitializerContext) {
    this.config = initializerContext.config.get<ClientConfigType>();
    this.data.externalUrl = new ExternalUrl(this.config.host || '');
  }

  public setup(core: CoreSetup, plugins: PluginsSetup) {
    core.application.register({
      id: ENTERPRISE_SEARCH_PLUGIN.ID,
      title: ENTERPRISE_SEARCH_PLUGIN.NAV_TITLE,
      appRoute: ENTERPRISE_SEARCH_PLUGIN.URL,
      category: DEFAULT_APP_CATEGORIES.enterpriseSearch,
      mount: async (params: AppMountParameters) => {
        const [coreStart] = await core.getStartServices();
        const { chrome } = coreStart;
        chrome.docTitle.change(ENTERPRISE_SEARCH_PLUGIN.NAME);

        await this.getInitialData(coreStart.http);

        const { renderApp } = await import('./applications');
        const { EnterpriseSearch } = await import('./applications/enterprise_search');

        return renderApp(EnterpriseSearch, params, coreStart, plugins, this.config, this.data);
      },
    });

    core.application.register({
      id: APP_SEARCH_PLUGIN.ID,
      title: APP_SEARCH_PLUGIN.NAME,
      euiIconType: ENTERPRISE_SEARCH_PLUGIN.LOGO,
      appRoute: APP_SEARCH_PLUGIN.URL,
      category: DEFAULT_APP_CATEGORIES.enterpriseSearch,
      mount: async (params: AppMountParameters) => {
        const [coreStart] = await core.getStartServices();
        const { chrome } = coreStart;
        chrome.docTitle.change(APP_SEARCH_PLUGIN.NAME);

        await this.getInitialData(coreStart.http);

        const { renderApp } = await import('./applications');
        const { AppSearch } = await import('./applications/app_search');

        return renderApp(AppSearch, params, coreStart, plugins, this.config, this.data);
      },
    });

    core.application.register({
      id: WORKPLACE_SEARCH_PLUGIN.ID,
      title: WORKPLACE_SEARCH_PLUGIN.NAME,
      euiIconType: ENTERPRISE_SEARCH_PLUGIN.LOGO,
      appRoute: WORKPLACE_SEARCH_PLUGIN.URL,
      category: DEFAULT_APP_CATEGORIES.enterpriseSearch,
      mount: async (params: AppMountParameters) => {
        const [coreStart] = await core.getStartServices();
        const { chrome } = coreStart;
        chrome.docTitle.change(WORKPLACE_SEARCH_PLUGIN.NAME);

        await this.getInitialData(coreStart.http);

        const { renderApp } = await import('./applications');
        const { WorkplaceSearch } = await import('./applications/workplace_search');

        return renderApp(WorkplaceSearch, params, coreStart, plugins, this.config, this.data);
      },
    });

    if (plugins.home) {
      plugins.home.featureCatalogue.registerSolution({
        id: ENTERPRISE_SEARCH_PLUGIN.ID,
        title: ENTERPRISE_SEARCH_PLUGIN.NAME,
        subtitle: ENTERPRISE_SEARCH_PLUGIN.SUBTITLE,
        icon: 'logoEnterpriseSearch',
        descriptions: ENTERPRISE_SEARCH_PLUGIN.DESCRIPTIONS,
        path: ENTERPRISE_SEARCH_PLUGIN.URL,
      });

      plugins.home.featureCatalogue.register({
        id: APP_SEARCH_PLUGIN.ID,
        title: APP_SEARCH_PLUGIN.NAME,
        icon: 'appSearchApp',
        description: APP_SEARCH_PLUGIN.DESCRIPTION,
        path: APP_SEARCH_PLUGIN.URL,
        category: FeatureCatalogueCategory.DATA,
        showOnHomePage: false,
      });

      plugins.home.featureCatalogue.register({
        id: WORKPLACE_SEARCH_PLUGIN.ID,
        title: WORKPLACE_SEARCH_PLUGIN.NAME,
        icon: 'workplaceSearchApp',
        description: WORKPLACE_SEARCH_PLUGIN.DESCRIPTION,
        path: WORKPLACE_SEARCH_PLUGIN.URL,
        category: FeatureCatalogueCategory.DATA,
        showOnHomePage: false,
      });
    }
  }

  public start(core: CoreStart) {}

  public stop() {}

  private async getInitialData(http: HttpSetup) {
    if (!this.config.host) return; // No API to call
    if (this.hasInitialized) return; // We've already made an initial call

    try {
      const { publicUrl, ...initialData } = await http.get('/api/enterprise_search/config_data');
      this.data = { ...this.data, ...initialData };
      if (publicUrl) this.data.externalUrl = new ExternalUrl(publicUrl);

      this.hasInitialized = true;
    } catch {
      this.data.errorConnecting = true;
      // The plugin will attempt to re-fetch config data on page change
    }
  }
}
