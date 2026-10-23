declare module '@alicloud/bssopenapi20171214' {
  interface QueryAccountBalanceData {
    AvailableAmount?: string
    AvailableCashAmount?: string
    CreditAmount?: string
    Currency?: string
    TotalAmount?: string
    OverdueAmount?: string
  }

  interface QueryAccountBalanceBody {
    Code?: string
    Message?: string
    Success?: boolean
    Data?: QueryAccountBalanceData
  }

  interface QueryAccountBalanceResponse {
    statusCode: number
    headers: Record<string, string>
    data: QueryAccountBalanceBody
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
