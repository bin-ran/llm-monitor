declare module '@alicloud/bssopenapi20171214' {
  interface QueryAccountBalanceData {
    availableAmount?: string
    availableCashAmount?: string
    creditAmount?: string
    currency?: string
    mybankCreditAmount?: string
    quotaLimit?: string
  }

  interface QueryAccountBalanceBody {
    code?: string
    message?: string
    requestId?: string
    success?: boolean
    data?: QueryAccountBalanceData
  }

  interface QueryAccountBalanceResponse {
    statusCode?: number
    headers?: Record<string, string>
    body?: QueryAccountBalanceBody
  }

  interface BssOpenApiConfig {
    accessKeyId: string
    accessKeySecret: string
    endpoint?: string
  }

  export default class BssOpenApi {
    constructor(config: BssOpenApiConfig)
    queryAccountBalance(): Promise<QueryAccountBalanceResponse>
  }
}
