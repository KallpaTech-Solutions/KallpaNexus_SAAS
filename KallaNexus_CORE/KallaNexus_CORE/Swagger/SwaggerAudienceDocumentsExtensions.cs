using Microsoft.OpenApi;

namespace KallpaNexus.API.Swagger;

public static class SwaggerAudienceDocumentsExtensions
{
    public static void AddNexusSwaggerAudienceDocuments(this Swashbuckle.AspNetCore.SwaggerGen.SwaggerGenOptions options)
    {
        foreach (var doc in ApiDocumentationGroups.Documents)
        {
            options.SwaggerDoc(doc.Id, new OpenApiInfo
            {
                Title = doc.Title,
                Version = "v1",
                Description = doc.Description
            });
        }

        options.DocInclusionPredicate((docName, apiDesc) =>
        {
            var group = apiDesc.GroupName;
            if (string.IsNullOrWhiteSpace(group))
            {
                group = ApiDocumentationGroups.InferFromPath(apiDesc.RelativePath);
            }

            return string.Equals(docName, group, StringComparison.OrdinalIgnoreCase);
        });

        options.TagActionsBy(api =>
        {
            var path = api.RelativePath ?? string.Empty;
            var tag = api.ActionDescriptor.RouteValues.TryGetValue("controller", out var c)
                ? c
                : "API";
            return [tag ?? "API"];
        });

        options.OrderActionsBy(apiDesc => apiDesc.RelativePath ?? string.Empty);
    }
}
