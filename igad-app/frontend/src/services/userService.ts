import { apiClient } from './apiClient'

export interface CognitoUser {
  username: string
  email: string
  email_verified: boolean
  enabled: boolean
  user_status: string
  created_date: string
  last_modified_date: string
  groups?: string[]
  attributes?: Record<string, string>
}

export interface CreateUserRequest {
  username: string
  email: string
  temporary_password: string
  send_email?: boolean
}

export interface UpdateUserRequest {
  attributes: Record<string, string>
}

export interface ResetPasswordRequest {
  temporary_password: string
}

export interface UserListResponse {
  success: boolean
  users: CognitoUser[]
  pagination_token?: string
}

export interface UserResponse {
  success: boolean
  user: CognitoUser
}

export interface CreateGroupRequest {
  name: string
  description?: string
  precedence?: number
}

export interface GroupsResponse {
  success: boolean
  groups: Array<{
    name: string
    description: string
    precedence?: number
    creation_date?: string
    last_modified_date?: string
  }>
}

class UserService {
  async listUsers(limit: number = 60, paginationToken?: string): Promise<UserListResponse> {
    const params = new URLSearchParams()
    params.append('limit', limit.toString())
    if (paginationToken) {
      params.append('pagination_token', paginationToken)
    }

    const response = await apiClient.get(`/admin/users?${params.toString()}`)
    return response.data
  }

  async getUser(username: string): Promise<UserResponse> {
    const response = await apiClient.get(`/admin/users/${username}`)
    return response.data
  }

  async createUser(userData: CreateUserRequest): Promise<UserResponse> {
    const response = await apiClient.post('/admin/users', userData)
    return response.data
  }

  async updateUser(
    username: string,
    userData: UpdateUserRequest
  ): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.put(`/admin/users/${username}`, userData)
    return response.data
  }

  async deleteUser(username: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete(`/admin/users/${username}`)
    return response.data
  }

  async enableUser(username: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post(`/admin/users/${username}/enable`)
    return response.data
  }

  async disableUser(username: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post(`/admin/users/${username}/disable`)
    return response.data
  }

  async resetUserPassword(
    username: string,
    passwordData: ResetPasswordRequest
  ): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post(`/admin/users/${username}/reset-password`, passwordData)
    return response.data
  }

  async listGroups(): Promise<GroupsResponse> {
    const response = await apiClient.get('/admin/groups')
    return response.data
  }

  async addUserToGroup(
    username: string,
    groupName: string
  ): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post(`/admin/users/${username}/groups/${groupName}`)
    return response.data
  }

  async removeUserFromGroup(
    username: string,
    groupName: string
  ): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete(`/admin/users/${username}/groups/${groupName}`)
    return response.data
  }

  async createGroup(
    groupData: CreateGroupRequest
  ): Promise<{ success: boolean; message: string; group?: any }> {
    const response = await apiClient.post('/admin/groups', groupData)
    return response.data
  }

  async deleteGroup(groupName: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete(`/admin/groups/${groupName}`)
    return response.data
  }
}

export const userService = new UserService()
