import { 
    ChapterProviding,
    ContentRating,
    HomePageSectionsProviding,
    MangaProviding,
    SearchResultsProviding,
    SourceInfo,
    SourceIntents,
    Request,
    Response,
    PagedResults,
    SearchRequest,
    SourceManga,
    Chapter,
    ChapterDetails,
    HomeSection,
    HomeSectionType,
    PartialSourceManga,
    TagSection,
    Tag,
    DUISection
} from '@paperback/types'

import { 
    parseChapterDetails,
    parseChapters,
    parseHomeSections, 
    parseMangaDetails, 
    parseSearchResults, 
    parseViewMore,
    parseFeatured
} from './ManHuaGuiParser'

import {
    contentSettings,
    resetSettings,
    getShowNSFW,
    getSkipExtra
} from './ManHuaGuiSettings'

import { CheerioAPI } from 'cheerio/lib/load'

import tagJSON from './tags.json'


const BASE_URL = 'https://tw.manhuagui.com'

export const ManHuaGuiInfo: SourceInfo = {
    version: '0.0.1',
    name: 'ManHuaGui',
    icon: 'icon.png',
    author: 'Jacky C',
    description: 'Extension that pulls manga from ManHuaGui.com',
    contentRating: ContentRating.EVERYONE,
    websiteBaseURL: BASE_URL,
    intents: SourceIntents.MANGA_CHAPTERS | SourceIntents.HOMEPAGE_SECTIONS | SourceIntents.SETTINGS_UI,
}

// export class ManHuaGui implements SearchResultsProviding, MangaProviding, ChapterProviding, HomePageSectionsProviding {
export class ManHuaGui implements HomePageSectionsProviding, MangaProviding, ChapterProviding, SearchResultsProviding {
    constructor(private cheerio: CheerioAPI) {}

    requestManager = App.createRequestManager({
        requestsPerSecond: 1,
        requestTimeout: 15000,
        interceptor: {
            interceptRequest: async (request: Request): Promise<Request> => {
                request.headers = {
                    ...(request.headers ?? {}),
                    ...{
                        'referer': `${BASE_URL}/`,
                        'user-agent': await this.requestManager.getDefaultUserAgent()
                    }
                }
                request.url.replace(/^http:/, 'https:')
                return request
            },
            interceptResponse: async (response: Response): Promise<Response> => {
                return response
            }
        }
    });

    stateManager = App.createSourceStateManager();

    async getSourceMenu(): Promise<DUISection> {
        return App.createDUISection(
            {

                id: 'main',
                header: 'Source Settings',
                rows: async () => {
                    return [
                        contentSettings(this.stateManager),
                        resetSettings(this.stateManager)
                    ]
                },
                isHidden: false
            }
        )

    }

    async getResponse(request: Request): Promise<CheerioAPI>{
        const response = await this.requestManager.schedule(request, 1)
        // this.CloudFlareError(response.status)
        const $ = this.cheerio.load(response.data as string)
        return $
    }

    async getHomePageSections(sectionCallback: (section: HomeSection) => void): Promise<void> {
        
        const featuredRequest = App.createRequest({
            url: `${BASE_URL}/rank/week.html`,
            method: 'GET'
        })

        const popularRequest = App.createRequest({
            url: `${BASE_URL}/list/view.html`,
            method: 'GET'
        })

        const latestRequest = App.createRequest({
            url: `${BASE_URL}/list/update.html`,
            method: 'GET'
        })

        const newRequest = App.createRequest({
            url: `${BASE_URL}/list/`,
            method: 'GET'
        })

        const featuredSection = App.createHomeSection({
            id: "featured",
            title: "周排行",
            containsMoreItems: false,
            type: HomeSectionType.featured,
        })
        sectionCallback(featuredSection)
        

        const popularSection = App.createHomeSection({
            id: "popular",
            title: "人氣最旺",
            containsMoreItems: true,
            type: HomeSectionType.singleRowNormal,
            items: parseHomeSections(await this.getResponse(popularRequest))
        })
        sectionCallback(popularSection)

        const latestSection = App.createHomeSection({
            id: "latest",
            title: "最新更新",
            containsMoreItems: true,
            type: HomeSectionType.singleRowNormal,
        })
        sectionCallback(latestSection)

        const newSection = App.createHomeSection({
            id: "new",
            title: "最新發布",
            containsMoreItems: true,
            type: HomeSectionType.singleRowNormal,
        })
        sectionCallback(newSection)

        featuredSection.items = parseFeatured(await this.getResponse(featuredRequest))
        sectionCallback(featuredSection)
        popularSection.items = parseHomeSections(await this.getResponse(popularRequest))
        sectionCallback(popularSection)
        latestSection.items = parseHomeSections(await this.getResponse(latestRequest))
        sectionCallback(latestSection)
        newSection.items = parseHomeSections(await this.getResponse(newRequest))
        sectionCallback(newSection)



    }
    
    async getViewMoreItems(homepageSectionId: string, metadata: any): Promise<PagedResults> {
        let page = metadata?.page ?? 1
        if (page == -1) return App.createPagedResults({ results: [], metadata: { page: -1 } })
        let url = ''

        let pageSuffix = page == 1 ? "" : `_p${page}` // the suburl for first page is simply the subdomain

        if (homepageSectionId == 'popular'){
            url = `${BASE_URL}/list/view${pageSuffix}.html`
        } else if (homepageSectionId == "latest"){
            url = `${BASE_URL}/list/update${pageSuffix}.html`
        } else if (homepageSectionId == "new"){
            url = page == 1 ? `${BASE_URL}/list/` : `${BASE_URL}/list/index${pageSuffix}.html`
        }
        
        const request = App.createRequest({
            url,
            method: 'GET'
        })

        const response = await this.requestManager.schedule(request, 1)
        const $ = this.cheerio.load(response.data as string)
        const manga: PartialSourceManga[] = parseViewMore($)

        page++
        if (manga.length < 10) page = -1

        return App.createPagedResults({
            results: manga,
            metadata: { page: page }
        })
    }

    async getSearchResults(query: SearchRequest, metadata: any): Promise<PagedResults> {

        let url = ''
        let page = metadata?.page ?? 1
        if (page == -1) return App.createPagedResults({ results: [], metadata: { page: -1 } })

        let manga: PartialSourceManga[] = []


        if (query.includedTags?.length > 0){

            const queryTags: Tag[] = []

            for (const tagGroup of tagJSON) {

                const filteredTags = query.includedTags.filter(value => tagGroup.tags.map(x=>x.id).includes(value.id))
                const firstTag = filteredTags.at(0)

                if (typeof firstTag !== 'undefined') queryTags.push(firstTag)

            }
            const queryStr = queryTags.map(x => x.id).join("_")

            url = `${BASE_URL}/list/${queryStr}/view_p${page}.html`
            const request = App.createRequest({
                url: url,
                method: 'GET',
            })
            manga = parseHomeSections(await this.getResponse(request))

        } else {
            const queryURI = encodeURIComponent(query.title ?? '')
            url = `${BASE_URL}/s/${queryURI}_o${page}.html`
            const request = App.createRequest({
                url: url,
                method: 'GET',
            })
            manga = parseSearchResults(await this.getResponse(request))
        }

        page++
        if (manga.length < 10) page = -1

        return App.createPagedResults({
            results: manga,
            metadata: { page: page }
        })
    }

    // ###################################
    // MangaProviding
    // ##################################

    async getMangaDetails(mangaId: string): Promise<SourceManga> {
        const request = App.createRequest({
            url: `${BASE_URL}/comic/${mangaId}/`,
            method: 'GET'
        })
        const response = await this.requestManager.schedule(request, 1)
        const $ = this.cheerio.load(response.data as string)

        return parseMangaDetails($, mangaId)
    }

    getMangaShareUrl?(mangaId: string): string {
        return `${BASE_URL}/comic/${mangaId}`
    }

    // ###################################
    // ChapterProviding
    // ##################################

    async getChapters(mangaId: string): Promise<Chapter[]> {
        const request = App.createRequest({
            url: `${BASE_URL}/comic/${mangaId}/`,
            method: 'GET'
        })
        const response = await this.requestManager.schedule(request, 1)
        const $ = this.cheerio.load(response.data as string)

        
        const showNSFW = await getShowNSFW(this.stateManager)
        const skipExtra = await getSkipExtra(this.stateManager)

        return parseChapters($, showNSFW, skipExtra)
    }
    async getChapterDetails(mangaId: string, chapterId: string): Promise<ChapterDetails> {
        const request = App.createRequest({
            url: `${BASE_URL}/comic/${mangaId}/${chapterId}.html`,
            method: 'GET'
        })

        const response = await this.requestManager.schedule(request, 1)
        const $ = this.cheerio.load(response.data as string)


        return parseChapterDetails($, mangaId, chapterId)
    }

    // ###################################
    // Tags Support
    // ##################################

    async supportsTagExclusion(): Promise<boolean> {
        return false
    }

    async getSearchTags(): Promise<TagSection[]> {
        const sections: Record<string, TagSection> = {}

        for (const tagGroup of tagJSON) {
            const id = tagGroup.id
            const label = tagGroup.label

            const tags: Tag[] = []
            for (const tag of tagGroup.tags){
                const tagID = tag.id
                const tagLabel = tag.label

                tags.push(App.createTag({
                    id: tagID,
                    label: tagLabel
                }))
            }

            if (sections[id] == null) {
                sections[id] = App.createTagSection({ id, label, tags })
            }
            
            // Since we already know that a section for the group has to exist, eslint is complaining
            // for no reason at all.
            // @ts-ignore: Object is possibly 'null'.
            sections[id].tags = tags
        }

        return Object.values(sections)
    }


    // async getCloudflareBypassRequestAsync(): Promise<Request> {
    //     return App.createRequest({
    //         url: `${BASE_URL}/`,
    //         method: 'GET',
    //         headers: {
    //             'user-agent': await this.requestManager.getDefaultUserAgent(),
    //             'referer': `${BASE_URL}/`
    //         }
    //     })
    // }

    // CloudFlareError(status: number): void {
    //     if (status == 503 || status == 403) {
    //         throw new Error(`CLOUDFLARE BYPASS ERROR:\nPlease go to the homepage of <${ManHuaGui.name}> and press Cloudflare Bypass`)
    //     }
    // }

}