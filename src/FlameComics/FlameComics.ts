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
    PartialSourceManga
} from '@paperback/types'
import { 
    parseChapterDetails,
    parseChapters,
    parseHomeSections, 
    parseMangaDetails, 
    parseSearchResults, 
    parseViewMore
} from './FlameComicsParser'


const FC_DOMAIN = 'https://flamecomics.com'

export const FlameComicsInfo: SourceInfo = {
    version: '0.0.0',
    name: 'Flame Comics',
    icon: 'icon.png',
    author: 'ifacodes',
    description: 'Extension that pulls manga from Flame Comics',
    contentRating: ContentRating.EVERYONE,
    websiteBaseURL: FC_DOMAIN,
    intents: SourceIntents.MANGA_CHAPTERS | SourceIntents.HOMEPAGE_SECTIONS | SourceIntents.CLOUDFLARE_BYPASS_REQUIRED
}

export class FlameComics implements SearchResultsProviding, MangaProviding, ChapterProviding, HomePageSectionsProviding {
    constructor(private cheerio: CheerioAPI) {}

    requestManager = App.createRequestManager({
        requestsPerSecond: 4,
        requestTimeout: 15000,
        interceptor: {
            interceptRequest: async (request: Request): Promise<Request> => {
                request.headers = {
                    ...(request.headers ?? {}),
                    ...{
                        'referer': `${FC_DOMAIN}/`,
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

    async getChapters(mangaId: string): Promise<Chapter[]> {
        const request = App.createRequest({
            url: `${FC_DOMAIN}/series/${mangaId}/`,
            method: 'GET'
        })
        const response = await this.requestManager.schedule(request, 1)
        this.CloudFlareError(response.status)
        const $ = this.cheerio.load(response.data as string)
        return parseChapters($)
    }
    async getChapterDetails(mangaId: string, chapterId: string): Promise<ChapterDetails> {
        const request = App.createRequest({
            url:  `${FC_DOMAIN}/${chapterId}/`,
            method: 'GET'
        })

        const response = await this.requestManager.schedule(request, 1)
        this.CloudFlareError(response.status)
        const $ = this.cheerio.load(response.data as string)
        return parseChapterDetails($, mangaId, chapterId)
    }

    async getMangaDetails(mangaId: string): Promise<SourceManga> {
        const request = App.createRequest({
            url: `${FC_DOMAIN}/series/${mangaId}/`,
            method: 'GET'
        })
        const response = await this.requestManager.schedule(request, 1)
        this.CloudFlareError(response.status)
        const $ = this.cheerio.load(response.data as string)

        return parseMangaDetails($, mangaId)
    }

    async getHomePageSections(sectionCallback: (section: HomeSection) => void): Promise<void> {
        const request = App.createRequest({
            url: `${FC_DOMAIN}/`,
            method: 'GET'
        })

        const response = await this.requestManager.schedule(request, 1)
        this.CloudFlareError(response.status)
        const $ = this.cheerio.load(response.data as string)
        return parseHomeSections($, sectionCallback)
    }
    async getViewMoreItems(homepageSectionId: string, metadata: any): Promise<PagedResults> {
        let page = metadata?.page ?? 1
        if (page == -1) return App.createPagedResults({ results: [], metadata: { page: -1 } })
        let url = ''
        if      (homepageSectionId == '2') url = `${FC_DOMAIN}/series/?page=${page}&order=update`
        else if (homepageSectionId == '3') url = `${FC_DOMAIN}/series/?page=${page}?status=&type=&order=popular`
        const request = App.createRequest({
            url,
            method: 'GET'
        })

        const response = await this.requestManager.schedule(request, 1)
        this.CloudFlareError(response.status)
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
        let page = metadata?.page ?? 1
        if (page == -1) return App.createPagedResults({ results: [], metadata: { page: -1 } })

        const param = `/page/${page}/?s=${(query.title ?? '').replace(/\s/g, '+')}`
        const request = App.createRequest({
            url: `${FC_DOMAIN}`,
            method: 'GET',
            param
        })

        const response = await this.requestManager.schedule(request, 1)
        this.CloudFlareError(response.status)
        const $ = this.cheerio.load(response.data as string)
        const manga = parseSearchResults($)

        page++
        if (manga.length < 10) page = -1

        return App.createPagedResults({
            results: manga,
            metadata: { page: page }
        })
    }

    getMangaShareUrl?(mangaId: string): string {
        return `${FC_DOMAIN}/series/${mangaId}`
    }

    async getCloudflareBypassRequestAsync(): Promise<Request> {
        return App.createRequest({
            url: `${FC_DOMAIN}/`,
            method: 'GET',
            headers: {
                'user-agent': await this.requestManager.getDefaultUserAgent(),
                'referer': `${FC_DOMAIN}/`
            }
        })
    }

    CloudFlareError(status: number): void {
        if (status == 503 || status == 403) {
            throw new Error(`CLOUDFLARE BYPASS ERROR:\nPlease go to the homepage of <${FlameComics.name}> and press Cloudflare Bypass`)
        }
    }

}