import "server-only"

export const REQUIRED_FACEBOOK_GROUP_PERMISSION = "groups_access_member_info"

type FacebookUser = {
  id?: string
  name?: string
}

type FacebookPermission = {
  permission?: string
  status?: string
}

type FacebookPermissionsResponse = {
  data?: FacebookPermission[]
}

export type FacebookTokenValidation =
  | { status: "valid"; user: Required<Pick<FacebookUser, "id">> & FacebookUser; scopes: string[] }
  | { status: "missing_group_permission" }
  | { status: "invalid" }
  | { status: "unavailable" }

export async function validateFacebookGroupToken(accessToken: string): Promise<FacebookTokenValidation> {
  try {
    const token = encodeURIComponent(accessToken)
    const [userResponse, permissionsResponse] = await Promise.all([
      fetch(`https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${token}`, { cache: "no-store" }),
      fetch(`https://graph.facebook.com/v19.0/me/permissions?access_token=${token}`, { cache: "no-store" }),
    ])
    const user = await userResponse.json() as FacebookUser
    const permissions = await permissionsResponse.json() as FacebookPermissionsResponse

    if (!userResponse.ok || !permissionsResponse.ok || !user.id) return { status: "invalid" }

    const grantedScopes = (permissions.data ?? [])
      .filter((permission) => permission.status === "granted" && typeof permission.permission === "string")
      .map((permission) => permission.permission as string)

    if (!grantedScopes.includes(REQUIRED_FACEBOOK_GROUP_PERMISSION)) {
      return { status: "missing_group_permission" }
    }

    return { status: "valid", user: user as Required<Pick<FacebookUser, "id">> & FacebookUser, scopes: grantedScopes }
  } catch {
    return { status: "unavailable" }
  }
}

type FacebookGroup = {
  id?: string
}

export type FacebookGroupAccess =
  | { status: "accessible"; groupId: string }
  | { status: "inaccessible" }
  | { status: "unavailable" }

export async function resolveFacebookGroup(accessToken: string, groupIdentifier: string): Promise<FacebookGroupAccess> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/${encodeURIComponent(groupIdentifier)}?fields=id&access_token=${encodeURIComponent(accessToken)}`,
      { cache: "no-store" },
    )
    const group = await response.json() as FacebookGroup

    if (response.ok && group.id) return { status: "accessible", groupId: group.id }
    if (response.status === 400 || response.status === 401 || response.status === 403 || response.status === 404) {
      return { status: "inaccessible" }
    }
    return { status: "unavailable" }
  } catch {
    return { status: "unavailable" }
  }
}